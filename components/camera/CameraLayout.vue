<template>
  <section class="camera__wrap">
    <v-layout justify-center align-center class="camera__controller">
      <v-btn v-if="status === 'start'" fab icon @click="stopStream('stop')">
        <v-icon dark size="42" color="red">mdi-stop-circle</v-icon>
      </v-btn>
      <v-btn v-else fab icon @click="startRTC">
        <v-icon dark size="50" color="indigo">mdi-record-rec</v-icon>
      </v-btn>
      <v-select
        v-if="deviceList.length > 0"
        v-model="deviceId"
        class="camera__controller__device-selector"
        :items="deviceList"
        :item-text="'label'"
        :item-value="'deviceId'"
        :label="'select camera device'"
        hide-details
      />
      <v-btn
        :disabled="!deviceId"
        :loading="loading"
        class="camera__controller__analyze"
        @click="startAnalyze"
      >
        analyze
      </v-btn>
    </v-layout>
    <v-layout justify-center align-center class="camera__layout">
      <div class="video-screen">
        <video id="video" autoplay playsinline :poster="posterImage" />
      </div>
      <div class="result-view">
        <div class="result-view__image">
          <v-img :src="resultImage" />
        </div>
        <div class="result-view__chart">
          <chart
            v-if="Object.keys(resultPredict).length > 0"
            :labels="chartLabels"
            :data="chartData"
            :options="chartOptions"
            :colors="chartColors"
            :styles="{ height: '280px', width: '380px' }"
          />
        </div>
      </div>
    </v-layout>
    <canvas id="capture-image"></canvas>
  </section>
</template>

<script>
import Chart from '@/components/common/Chart.vue'
import color from '@/assets/const/color.js'

export default {
  components: {
    Chart,
  },
  props: {},
  data() {
    return {
      loading: false,
      status: null,
      deviceId: null,
      deviceList: [],
      stream: null,
      interval: null,
      intervalTime: 20000,
      delayTime: 3000,
      timestamp: '',
      resultRef: null,
      resultImage: '',
      resultPredict: {},
      chartData: [],
      chartLabels: [],
      chartColors: [],
      chartBaseColor: color.chartBaseColor,
      chartOptions: {
        maintainAspectRatio: false,
        animation: {
          duration: 1500,
          easing: 'easeInOutCubic',
        },
        legend: {
          display: false,
        },
        scales: {
          yAxes: [
            {
              ticks: {
                min: 0,
                stepSize: 1,
              },
            },
          ],
        },
      },
    }
  },
  computed: {
    posterImage() {
      return require('@/assets/image/poster_image.png')
    },
    userId() {
      return this.$store.state.auth.id
    },
    predictApiUrl() {
      if (process.env.MODE === 'dev') {
        return 'https://yolo.live-vision.work:5000/predict'
      }
      return 'http://localhost:5000/predict'
    },
  },
  watch: {
    async deviceId() {
      await this.setCameraDevice()
    },
  },
  methods: {
    async startRTC() {
      this.status = 'start'
      await this.permission()
      await this.getMediaDevice()
      await this.setCameraDevice()
    },
    getMediaDevice() {
      return new Promise((resolve, reject) => {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            devices.forEach((device) => {
              // 今回はオーディオは使わないのでvideのみ追加
              if (device.kind === 'videoinput') {
                this.deviceList.push(device)
              }
            })
            if (this.deviceList.length > 0) {
              this.deviceId = this.deviceList[0].deviceId
            }
            resolve()
          })
          .catch((error) => {
            reject(error)
            this.handleError(error)
          })
      })
    },
    async permission() {
      await navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'environment', width: 500, height: 500 },
          audio: false,
        })
        .then(this.handleSuccess)
        .catch((error) => {
          this.handleError(error)
        })
    },
    async setCameraDevice() {
      this.stopStream()
      let constraints = null
      if (this.deviceId) {
        constraints = {
          video: {
            deviceId: this.deviceId,
          },
        }
      } else {
        constraints = {
          audio: false,
          video: true,
        }
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints)
        this.handleSuccess()
      } catch (error) {
        this.handleError(error)
      }
    },
    startAnalyze() {
      this.loading = true
      this.resultImage = ''
      this.resultPredict = {}
      this.timestamp = String(new Date().getTime())
      localStorage.setItem('timestamp', this.timestamp)
      this.resultRef = this.$firebase
        .database()
        .ref(`results/${this.userId}/${this.deviceId}/${this.timestamp}`)
      this.caputureFrame()
      setTimeout(() => {
        this.predict()
      }, this.delayTime)
    },
    caputureFrame() {
      const captureImage = document.getElementById('capture-image')
      const canvas = captureImage.getContext('2d')
      const video = document.getElementById('video')

      captureImage.width = video.videoWidth
      captureImage.height = video.videoHeight
      canvas.drawImage(video, 0, 0)
      captureImage.toBlob(
        (blob) => {
          const storageRef = this.$firebaseStorage.ref()
          const imageRef = storageRef.child(
            `images/${this.userId}/${this.deviceId}/${this.timestamp}.jpeg`
          )
          imageRef.put(blob).then((snapshot) => {})
        },
        'image/jpeg',
        1
      )
    },
    async predict() {
      await this.$postApi(
        this.predictApiUrl,
        (_) => {
          this.downloadResultImage()
          this.setResult()
          this.loading = false
        },
        (error) => {
          this.loading = false
          throw error
        },
        {
          fileType: 'image',
          userId: this.userId,
          deviceId: this.deviceId,
          timestamp: this.timestamp,
        }
      )
    },
    downloadResultImage() {
      const storageRef = this.$firebaseStorage.ref()
      storageRef
        .child(
          `result/images/${this.userId}/${this.deviceId}/${this.timestamp}.jpeg`
        )
        .getDownloadURL()
        .then((url) => {
          const xhr = new XMLHttpRequest()
          xhr.responseType = 'blob'
          xhr.open('GET', url)
          xhr.send()
          this.resultImage = url
        })
        .catch((error) => {
          throw error
        })
    },
    stopStream(status = null) {
      if (status) {
        this.status = status
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop())
        this.stream = null
      }
      if (this.interval) {
        clearInterval(this.interval)
      }
    },
    setResult() {
      this.resultRef.on('value', (snapshot) => {
        if (!snapshot || !snapshot.val()) return
        this.resultPredict = snapshot.val()
        this.setChartData()
      })
    },
    setChartData() {
      this.chartLabels = Object.keys(this.resultPredict) || []
      this.chartData = []
      Object.keys(this.resultPredict).forEach((key) => {
        this.chartData.push(this.resultPredict[key])
      })
      this.chartColors = this.chartBaseColor.slice(0, this.chartLabels.length)
    },
    handleSuccess() {
      const video = document.querySelector('video')
      video.srcObject = this.stream
    },
    handleError(error) {
      throw error
    },
  },
}
</script>

<style lang="scss" scoped>
.camera {
  &__wrap {
    padding: 20px;
  }
  &__layout {
    border: thin solid #c3c3c3;
  }
  &__controller {
    height: 100px;
    padding: 16px;
    text-align: center;
    &__device-selector {
      margin: 0 0 0 30px;
      max-width: 230px;
    }
    &__analyze {
      position: absolute;
      right: 20px;
    }
  }
}

.video-screen {
  border-right: thin solid #c3c3c3;
  height: 600px;
}
.result-view {
  &__image {
    border-bottom: thin solid #c3c3c3;
    display: flex;
    align-items: center;
    width: 400px;
    height: 300px;
  }
  &__chart {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 400px;
    height: 300px;
    overflow: auto;
  }
}

#video {
  height: 100%;
  max-width: 100%;
}
#capture-image {
  display: none;
}
</style>
