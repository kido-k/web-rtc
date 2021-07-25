<template>
  <section class="camera__wrap">
    <v-layout justify-center align-center class="controller">
      <v-btn v-if="status === 'start'" fab icon @click="stopStream('stop')">
        <v-icon dark size="42" color="red">mdi-stop-circle</v-icon>
      </v-btn>
      <v-btn v-else fab icon @click="startRTC">
        <v-icon dark size="50" color="indigo">mdi-record-rec</v-icon>
      </v-btn>
      <v-select
        v-if="deviceList.length > 0"
        v-model="deviceId"
        class="controller__device-selector"
        :items="deviceList"
        :item-text="'label'"
        :item-value="'deviceId'"
        :label="'select camera device'"
        hide-details
      />
      <v-btn
        :disabled="!deviceId"
        class="controller__analyze"
        @click="startAnalyze"
        >analyze</v-btn
      >
    </v-layout>
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
    <canvas id="capture-image"></canvas>
  </section>
</template>

<script>
export default {
  props: {},
  data() {
    return {
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
      const getImageUrl = 'http://localhost:5000/predict'
      // const getImageUrl = 'https://yolo.live-vision.work:5000/predict'
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
.camera__wrap {
  padding: 20px;
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
  &__analyze {
    position: absolute;
    right: 20px;
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
