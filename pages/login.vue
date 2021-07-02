<template>
  <div class="login">
    <v-btn @click="login">LOGIN</v-btn>
  </div>
</template>

<script>
export default {
  data() {
    return {}
  },
  computed: {},
  methods: {
    login() {
      const provider = new this.$firebase.auth.GoogleAuthProvider()
      this.$firebase
        .auth()
        .signInWithPopup(provider)
        .then((result) => {
          const user = result.user
          this.$store.commit('auth/setUser', user.uid)
          this.$router.push('/')
        })
        .catch((error) => {
          throw error
        })
    },
  },
}
</script>

<style lang="scss" scoped>
.login {
  height: 100%;
  margin: auto;
  display: flex;
  align-items: center;
  text-align: center;
}
</style>
