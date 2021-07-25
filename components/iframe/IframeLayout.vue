<template>
  <section class="iframe__wrap">
    <v-layout justify-center align-center class="controller">
      <v-text-field
        v-model="url"
        class="controller__url"
        hide-details
        label="iframe url"
        placeholder="ex: https://www.youtube.com/watch?v=XXXXXXXX"
      />
      <v-btn :disabled="!url" class="controller__analyze" @click="startAnalyze">
        analyze
      </v-btn>
    </v-layout>
    <v-layout v-if="!!url" justify-center align-center>
      <div class="video-screen">
        <iframe id="iframe-link" :src="url"></iframe>
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
      url: null,
      iframeId: null,
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
  mounted() {
    if (!localStorage.getItem('iframeId')) {
      this.iframeId = this.getUniqueId()
      console.log('mounted')
      console.log(this.iframeId)
      localStorage.setItem('iframeId', this.iframeId)
    }
  },
  methods: {
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
      const video = document.getElementById('iframe-link')

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
    setResult() {
      this.resultRef.on('value', (snapshot) => {
        if (!snapshot || !snapshot.val()) return
        this.resultPredict = snapshot.val()
      })
    },
    getUniqueId(number) {
      const characters =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let _number = 16
      if (number) _number = number
      return Array.from(Array(_number))
        .map(() => characters[Math.floor(Math.random() * characters.length)])
        .join('')
    },
  },
}
</script>

<style lang="scss" scoped>
.iframe__wrap {
  padding: 20px;
}

.controller {
  height: 100px;
  padding: 16px;
  text-align: center;
  &__url {
    margin: 0 0 0 30px;
    max-width: 500px;
  }
  &__analyze {
    position: absolute;
    right: 20px;
  }
}

.video-screen {
  border: thin solid #000;
  height: 480px;
  min-width: 60%;
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

#iframe-link {
  height: 100%;
  width: 100%;
  max-width: 100%;
}
#capture-image {
  display: none;
}
</style>
