import Vue from 'vue'
import App from './App.vue'
import Buefy from 'buefy'
import Connection from "@/components/Connection";
Vue.config.productionTip = false
Vue.use(Buefy)

new Vue({
  render: h => h(App),
  components: {
    'Connection': Connection
  }
}).$mount('#app')
