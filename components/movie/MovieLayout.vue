<template>
  <section class="iframe__wrap">
    <v-layout justify-center align-center class="controller">
      <v-file-input
        show-size
        accept=".mp4"
        label="upload movie"
        prepend-icon="mdi-video"
        class="controller__movie"
        @change="pickupMovie"
      />
      <v-btn
        :disabled="!movieUrl"
        class="controller__analyze"
        @click="startAnalyze"
      >
        analyze
      </v-btn>
    </v-layout>
    <div v-if="movieUrl">
      <video controls class="video-screen">
        <source :src="movieUrl" />
      </video>
    </div>
  </section>
</template>

<script>
export default {
  props: {},
  data() {
    return {
      movieFile: null,
      movieUrl: null,
      movieId: null,
      delayTime: 3000,
      timestamp: '',
    }
  },
  computed: {
    userId() {
      return this.$store.state.auth.id
    },
  },
  mounted() {
    if (!localStorage.getItem('movieId')) {
      this.movieId = this.getUniqueId()
      localStorage.setItem('movieId', this.movieId)
    } else {
      this.movieId = localStorage.getItem('movieId')
    }
  },
  methods: {
    pickupMovie(file) {
      if (file !== undefined && file !== null) {
        this.movieFile = file
        if (file.name.lastIndexOf('.') <= 0) {
          return
        }
        const fileReader = new FileReader()
        fileReader.readAsDataURL(file)
        fileReader.addEventListener('load', () => {
          this.movieUrl = fileReader.result
        })
      } else {
        this.movieUrl = ''
      }
    },
    startAnalyze() {
      this.timestamp = String(new Date().getTime())
      const storageRef = this.$firebaseStorage.ref()
      const movieRef = storageRef.child(
        `movie/${this.userId}/${this.movieId}.mp4`
      )
      movieRef.put(this.movieFile).then((snapshot) => {
        this.predict()
      })
    },
    async predict() {
      const getImageUrl = 'http://localhost:5000/predict'
      // const getImageUrl = 'https://yolo.live-vision.work:5000/predict'
      await this.$postApi(
        getImageUrl,
        (_) => {
          this.downloadResultMovie()
        },
        (error) => {
          throw error
        },
        {
          fileType: 'video',
          userId: this.userId,
          deviceId: this.movieId,
          timestamp: this.timestamp,
        }
      )
    },
    downloadResultMovie() {
      const storageRef = this.$firebaseStorage.ref()
      storageRef
        .child(`result/movie/${this.userId}/${this.movieId}_m2det.mp4`)
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
  &__movie {
    margin: 0 0 0 30px;
    max-width: 500px;
    cursor: pointer;
  }
  &__analyze {
    position: absolute;
    right: 20px;
  }
}

.video-screen {
  width: 100%;
}
</style>
