<template>
  <section class="results__wrap">
    <div>
      <v-select
        v-model="selectedItemKey"
        :items="resultItems"
        class="results__selected-items"
      />
    </div>
    <div v-if="selectedResults">
      <v-simple-table class="results__table">
        <template>
          <thead>
            <tr>
              <th class="text-left">Time</th>
              <th class="text-left">Person</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in selectedResults"
              :key="index"
              @click="setResultImage(item)"
            >
              <td>{{ item.time }}</td>
              <td>{{ item.person }}</td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>
    </div>
    <div v-if="resultImage" class="results__image">
      <v-img :src="resultImage" />
    </div>
    <div v-if="resultMovie">
      <video controls class="results__movie">
        <source :src="resultMovie" />
      </video>
    </div>
    <div v-if="chartData.length > 0 && !rendering" class="results__chart">
      <chart
        :labels="chartLabels"
        :data="chartData"
        :options="chartOptions"
        :colors="chartColors"
        :styles="{ height: '400px', width: '800px' }"
      />
    </div>
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
      results: null,
      resultItems: [],
      selectedItemKey: null,
      selectedResults: null,
      resultImage: null,
      resultMovie: null,
      rendering: false,
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
  },
  watch: {
    selectedItemKey() {
      this.resetData()
      const result = this.results[this.selectedItemKey]
      if (Array.isArray(result)) {
        this.selectedResults = this.results[this.selectedItemKey]
        this.selectedResults.shift()
        this.selectedResults.forEach((result, index) => {
          result.time = index
          result.type = 'movie'
        })
      } else {
        this.selectedResults = []
        Object.keys(result).forEach((key) => {
          const time = this.getDate(key)
          const data = result[key]
          data.time = time
          data.timestamp = key
          data.type = 'image'
          this.selectedResults.push(data)
        })
      }
      this.setChartData()
    },
  },
  mounted() {
    this.setResultItems()
  },
  methods: {
    setResultItems() {
      const ref = this.$firebase.database().ref(`results/${this.userId}`)
      ref.on('value', (snapshot) => {
        if (!snapshot || !snapshot.val()) return
        this.results = snapshot.val()
        this.resultItems = Object.keys(this.results)
      })
    },
    resetData() {
      console.log('resetData')
      this.resultImage = null
      this.resultMovie = null
      this.chartLabels = []
      this.chartData = []
      this.chartColors = []
      this.rendering = true
      setTimeout(() => {
        this.rendering = false
      }, 1000)
    },
    getDate(timestamp) {
      const date = new Date(Number(timestamp))
      const yyyy = `${date.getFullYear()}`
      const MM = `0${date.getMonth() + 1}`.slice(-2)
      const dd = `0${date.getDate()}`.slice(-2)
      const HH = `0${date.getHours()}`.slice(-2)
      const mm = `0${date.getMinutes()}`.slice(-2)
      const ss = `0${date.getSeconds()}`.slice(-2)

      return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`
    },
    setResultImage(item) {
      if (item.type === 'image') {
        this.downloadResultImage(item)
      } else {
        this.downloadResultMovie(item)
      }
    },
    downloadResultImage(item) {
      const storageRef = this.$firebaseStorage.ref()
      storageRef
        .child(
          `result/images/${this.userId}/${this.selectedItemKey}/${item.timestamp}.jpeg`
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
    downloadResultMovie(item) {
      const storageRef = this.$firebaseStorage.ref()
      storageRef
        .child(`result/movie/${this.userId}/${this.selectedItemKey}_m2det.mp4`)
        .getDownloadURL()
        .then((url) => {
          this.resultMovie = url
        })
        .catch((error) => {
          throw error
        })
    },
    setChartData() {
      this.selectedResults.forEach((result) => {
        this.chartLabels.push(result.time)
        this.chartData.push(result.person)
        this.chartColors.push(this.chartBaseColor[0])
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.results {
  &__wrap {
    padding: 0 20px 20px 20px;
  }
  &__selected-items {
    width: 200px;
  }
  &__table {
    height: 400px;
    overflow: scroll;
  }
  &__image {
    margin: 50px auto;
    display: flex;
    align-items: center;
    width: 80%;
    height: 100%;
  }
  &__movie {
    margin: 50px auto;
    display: flex;
    align-items: center;
    width: 80%;
    height: 100%;
  }
  &__chart {
    margin: 50px auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
