export default (context) => {
  const userId = context.store.state.auth.id
  if (!userId) {
    context.redirect('/login')
  }
}
