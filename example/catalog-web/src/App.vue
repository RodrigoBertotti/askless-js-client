<template>

  <div style="display: flex; flex-direction: column; width: 500px; margin: 60px auto; ">

    <b-input icon="magnify" type="search" placeholder="Search..." ></b-input>

    <Connection description="Connect as viewer, no token on headers"
                v-bind:is-selected="currentOwnClientId==null"
                v-on:click="connect(null, null)"
                style="margin-top: 45px"
    ></Connection>

    <Connection description="Connect as admin, headers { Authorization: Bearer abcd, ownClientId: 1 }"
                v-bind:is-selected="currentOwnClientId===1"
                v-on:click="connect(1, {'Authorization': 'Bearer abcd'  })"
                style="margin-top: 30px"
    ></Connection>

    <Connection description="Connect as admin, headers { Authorization: Bearer efgh, ownClientId: 2 }"
                v-bind:is-selected="currentOwnClientId===2"
                v-on:click="connect(2, {'Authorization': 'Bearer efgh'   })"
                style="margin-top: 30px"
    ></Connection>

    <Connection description="WRONG token - headers { Authorization: Bearer wrong, ownClientId: -1 }"
                v-bind:is-selected="currentOwnClientId===-1"
                v-on:click="connect(-1, { 'Authorization': 'Bearer wrong' })"
                style="margin-top: 30px"
    ></Connection>



  </div>
</template>

<script>
import { AsklessClient} from "../../../dist/askless-js-client/web";
import Connection from '@/components/Connection.vue';

export default {
  name: 'catalog-web',
  components:{
    Connection,
  },
  created() {
    AsklessClient.instance.init({
      serverUrl: 'ws://192.168.2.1:3000',
      projectName: 'catalog-ts',
    });
    this.connect();
  },
  methods: {

    connect(currentOwnClientId, headers){
      console.log('connecting...');
      this.currentOwnClientId = currentOwnClientId;
      AsklessClient.instance.connect({
        ownClientId: currentOwnClientId,
        headers: headers
      });
    }

  },
  data(){

    return {
      currentOwnClientId: null
    }

  }
}
</script>

<style scoped>

</style>
