module.exports = {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {
    API_BASE_URL: '"http://localhost:3000/api/v1"'
  },
  mini: {},
  h5: {
    devServer: {
      client: {
        overlay: false
      }
    }
  }
}
