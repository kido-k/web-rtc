<template>
  <section>
    <div class="wrap">
      <h1 class="mb-6">dencity check</h1>
      <v-layout justify-center align-center>
        <div class="video-screen">
          <video id="video" autoplay playsinline :poster="posterImage" />
        </div>
        <div class="result-view">
          <div class="result-view__image">
            <v-img :src="resultImage" />
          </div>
          <div class="result-view__text">
            <p v-for="(key, index) in Object.keys(resultPredict)" :key="index">
              {{ key }}:{{ resultPredict[key] }}
            </p>
          </div>
        </div>
      </v-layout>
      <v-layout justify-center align-center class="controller">
        <v-btn v-if="status === 'start'" @click="stopStream('stop')">
          stop
        </v-btn>
        <v-btn v-else class="controller__camera" @click="startRTC">
          start
        </v-btn>
        <v-select
          v-if="deviceList.length > 0"
          v-model="deviceId"
          class="controller__device-selector"
          :items="deviceList"
          :item-text="'label'"
          :item-value="'deviceId'"
          :label="'select camera device'"
        />
        <v-btn @click="startDencityChecker">check</v-btn>
      </v-layout>
    </div>
    <canvas id="capture-image"></canvas>
  </section>
</template>

<script>
export default {
  middleware: ['init'],
  data() {
    return {
      status: null,
      deviceId: null,
      deviceList: [],
      stream: null,
      interval: null,
      intervalTime: 10000,
      delayTime: 3000,
      timestamp: '',
      resultRef: null,
      resultImage: '',
      resultPredict: {},
    }
  },
  computed: {
    posterImage() {
      return require('@/assets/image/poster_image.png')
    },
    userId() {
      return this.$store.state.auth.id
    },
  },
  watch: {
    async deviceId() {
      await this.setCameraDevice()
    },
  },
  mounted() {
    const timestamp = localStorage.getItem('timestamp')
    if (timestamp) {
      this.resultRef = this.$firebase
        .database()
        .ref(`results/${this.userId}/${timestamp}`)
      this.setResult()
      this.downloadResultImage()
    }
  },
  destroyed() {
    this.stopStream()
  },
  methods: {
    async startRTC() {
      this.status = 'start'
      await this.permission()
      await this.getMediaDevice()
      await this.setCameraDevice()
      this.interval = setInterval(() => {
        this.startDencityChecker()
      }, this.intervalTime)
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
    startDencityChecker() {
      this.timestamp = String(new Date().getTime())
      localStorage.setItem('timestamp', this.timestamp)
      this.resultRef = this.$firebase
        .database()
        .ref(`results/${this.userId}/${this.timestamp}`)
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
            `images/${this.userId}/${this.timestamp}.jpeg`
          )
          imageRef.put(blob).then((snapshot) => {})
        },
        'image/jpeg',
        1
      )
    },
    async predict() {
      // const getImageUrl = 'http://localhost:5000/predict'
      const getImageUrl = 'https://yolo.live-vision.work:5000/predict'
      await this.$postApi(
        getImageUrl,
        (_) => {
          this.downloadResultImage()
          this.setResult()
        },
        (error) => {
          this.downloadResultImage()
          throw error
        },
        {
          userId: this.userId,
          timestamp: this.timestamp,
        }
      )
    },
    downloadResultImage() {
      const storageRef = this.$firebaseStorage.ref()
      storageRef
        .child(`result/images/${this.userId}/${this.timestamp}.jpeg`)
        .getDownloadURL()
        .then((url) => {
          const xhr = new XMLHttpRequest()
          xhr.responseType = 'blob'
          xhr.open('GET', url)
          xhr.send()
          this.resultImage = url
        })
        .catch((error) => {
          console.log(error.code)
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
      })
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
.wrap {
  width: 100%;
  min-height: 80%;
  padding: 20px 100px;
  text-align: center;
}
.video-screen {
  border: thin solid #000;
  height: 480px;
}
.result-view {
  &__image {
    width: 300px;
    height: 240px;
    border: thin solid #000;
  }
  &__text {
    width: 300px;
    height: 240px;
    border: thin solid #000;
    overflow: auto;
  }
}

.controller {
  height: 100px;
  padding: 16px;
  text-align: center;
  &__device-selector {
    margin: 0 0 0 30px;
    max-width: 230px;
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
