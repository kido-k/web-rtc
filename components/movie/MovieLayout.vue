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
    <div v-if="resultMovieUrl">
      <video controls class="video-screen">
        <source :src="resultMovieUrl" />
      </video>
    </div>
  </section>
</template>

<script>
// import * as stringUtil from '@/assets/util/string.js'

export default {
  props: {},
  data() {
    return {
      loading: false,
      movieFile: null,
      movieUrl: null,
      movieId: null,
      delayTime: 3000,
      timestamp: '',
      resultMovieUrl: null,
    }
  },
  computed: {
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
  mounted() {},
  methods: {
    pickupMovie(file) {
      this.resultMovieUrl = null
      if (file !== undefined && file !== null) {
        this.movieFile = file
        if (file.name.lastIndexOf('.') <= 0) {
          return
        } else {
          this.movieId = file.name.split('.')[0]
          this.downloadResultMovie()
        }
        const fileReader = new FileReader()
        fileReader.readAsDataURL(file)
        fileReader.addEventListener('load', () => {
          this.movieUrl = fileReader.result
        })
      } else {
        this.movieUrl = null
        this.resultMovieUrl = null
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
      this.loading = true
      await this.$postApi(
        this.predictApiUrl,
        (_) => {
          this.downloadResultMovie()
          this.loading = false
        },
        (error) => {
          this.loading = false
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
          this.resultMovieUrl = url
        })
        .catch((error) => {
          throw error
        })
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
  max-width: 800px;
  width: 100%;
}
</style>
