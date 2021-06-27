<template>
  <section>
    <div class="screen">
      <h1 class="mb-6">dencity check</h1>
      <video id="video" autoplay playsinline :poster="posterImage"></video>
      <v-layout justify-center align-center class="controller">
        <v-btn v-if="status === 'start'" @click="stopStream('stop')">
          stop
        </v-btn>
        <v-btn
          v-else
          class="controller__camera"
          color="alert"
          @click="startRTC"
        >
          camera
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
      </v-layout>
    </div>
    <canvas id="capture-image"></canvas>
  </section>
</template>

<script>
export default {
  data() {
    return {
      status: null,
      deviceId: null,
      deviceList: [],
      stream: null,
      caputureRef: null,
      interval: null,
      intervalTime: 10000,
    }
  },
  computed: {
    posterImage() {
      return require('@/assets/image/poster_image.png')
    },
  },
  watch: {
    async deviceId() {
      await this.setCameraDevice()
    },
  },
  mounted() {
    this.captureRef = this.$firebase.database().ref('caputure')
    if (!localStorage.getItem('fingerprint')) {
      this.$store.commit('fingerprint/createFingerprint')
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
      this.interval = setInterval(this.caputureFrame, 1000)
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
    caputureFrame() {
      const captureImage = document.getElementById('capture-image')
      const canvas = captureImage.getContext('2d')
      const video = document.getElementById('video')

      captureImage.width = video.videoWidth
      captureImage.height = video.videoHeight
      canvas.drawImage(video, 0, 0)
      const fingerprint = localStorage.getItem('fingerprint')
      captureImage.toBlob(
        (blob) => {
          const storageRef = this.$firebaseStorage.ref()
          const imageRef = storageRef.child(`images/${fingerprint}.jpeg`)
          imageRef.put(blob).then((snapshot) => {})
        },
        'image/jpeg',
        1
      )
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
.screen {
  width: 100%;
  min-height: 80%;
  padding: 20px;
  text-align: center;
}
#video {
  max-height: 80%;
  max-width: 80%;
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
#capture-image {
  display: none;
}
</style>
