<template>
  <section class="page__wrap">
    <v-card class="page__card-layout">
      <v-toolbar flat color="indigo" dark style="text-align: center">
        <v-toolbar-title>
          <h1>AI vision</h1>
        </v-toolbar-title>
      </v-toolbar>
      <v-tabs
        vertical
        class="page__tabs"
        background-color="indigo"
        color="white"
        slider-size="5"
      >
        <v-tab class="justify-start">
          <v-icon left> mdi-camera </v-icon>
          Camera
        </v-tab>
        <v-tab class="justify-start">
          <v-icon left> mdi-movie </v-icon>
          Movie
        </v-tab>
        <v-tab class="justify-start">
          <v-icon left> mdi-table </v-icon>
          Result
        </v-tab>

        <v-tab-item>
          <v-card flat>
            <camera-layout />
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <movie-layout />
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <v-card-text> results </v-card-text>
          </v-card>
        </v-tab-item>
      </v-tabs>
    </v-card>
  </section>
</template>

<script>
import CameraLayout from '~/components/camera/CameraLayout.vue'
// import IframeLayout from '~/components/iframe/IframeLayout.vue'
import MovieLayout from '~/components/movie/MovieLayout.vue'

export default {
  components: {
    CameraLayout,
    // IframeLayout,
    MovieLayout,
  },
  middleware: ['init'],
}
</script>

<style lang="scss" scoped>
.page {
  &__wrap {
    width: 100%;
    height: 100%;
    text-align: center;
  }
  &__card-layout {
    height: 100%;
    border-radius: 0;
  }
  &__tabs {
    height: 100%;
  }
}

.v-tabs-bar.v-item-group {
  height: 100%;
}

::v-deep .v-toolbar__content {
  justify-content: center;
}

::v-deep .v-slide-group__wrapper {
  padding: 10px 0 0 0;
}
</style>
