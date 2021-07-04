export default (context) => {
  const userId = context.store.state.auth.id
  if (!userId) {
    context.$firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        context.store.commit('auth/setUser', user.uid)
      } else {
        context.redirect('/login')
      }
    })
  }
}
