<template>

  <div style="display: flex; flex-direction: column; width: 500px; margin: 60px auto; ">

    <b-input icon="magnify" v-model="search" type="search" placeholder="Search..." v-on:input="refreshListen"></b-input>

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

    <span class="routeTitle">Route product/all</span>

    <ShowingProductsByListeningToARoute
      :products="products1"
      v-on:removeProduct="removeProduct"
      :is-new-data="isNewData1"
    ></ShowingProductsByListeningToARoute>

    <span class="routeTitle">Route product/all as well</span>

    <ShowingProductsByListeningToARoute
        :products="products2"
        v-on:removeProduct="removeProduct"
        :is-new-data="isNewData2"
    ></ShowingProductsByListeningToARoute>

    <span class="routeTitle">Route product/all/reversed </span>

    <ShowingProductsByListeningToARoute
        :products="products3"
        v-on:removeProduct="removeProduct"
        :is-new-data="isNewData3"
    ></ShowingProductsByListeningToARoute>

    <div style="height: 1px; background: lightgrey; margin-top: 40px"/>
    <span style="text-align: center; margin-top: 20px; margin-bottom: 20px">New product</span>
    <div style="display: flex; flex-direction: row;">
      <b-input v-model="productNameCtrl" placeholder="Name" ></b-input>
      <b-input v-model="productPriceCtrl" placeholder="Price" type="number" style="width: 120px"></b-input>
      <b-button icon-left="plus" :disabled="!productNameCtrl.length || !productPriceCtrl.length" v-on:click="addProduct()">Add</b-button>
    </div>

  </div>
</template>

<script>
import Connection from '@/components/Connection.vue';
import ShowingProductsByListeningToARoute from "@/components/ShowingProductsByListeningToARoute";
import {asklessClient} from "./AsklessClient";

export default {
  name: 'catalog-web',
  components:{
    ShowingProductsByListeningToARoute,
    Connection,
  },
  created() {
    asklessClient.init({
      serverUrl: 'ws://192.168.2.1:3000',
      projectName: 'catalog',
      logger: {
        useDefaultLogger: true
      }
    });
    this.connect();
  },
  methods: {

    async connect(currentOwnClientId, headers)  {
      console.log('connecting...');
      this.currentOwnClientId = currentOwnClientId;
      const res = (await asklessClient.connect({
        ownClientId: currentOwnClientId,
        headers: headers
      }));
      if(res.isSuccess()){
        this.refreshListen();
      }
    },

    async refreshListen(){
      console.log('refreshListen...');

      if(this.listening1 != null) {
        this.listening1.close();
        this.listening1 = null;

        this.listening2.close();
        this.listening2 = null;

        this.listening3.close();
        this.listening3 = null;

        console.log('Old listening has been closed');
      }

      this.listening1 = await asklessClient.listen({
        route: "product/all",
        query: {
          search: this.search
        },
        listener: (data) => {
          this.setProducts1(data.output);
        }
      });
      this.listening2 = await asklessClient.listen({
        route: "product/all",
        query: {
          search: this.search
        },
        listener: (data) => {
          this.setProducts2(data.output);
        }
      });
      this.listening3 = await asklessClient.listen({
        route: "product/all/reversed",
        query: {
          search: this.search
        },
        listener: (data) => {
          this.setProducts3(data.output);
        }
      })
    },

    setProducts1(products) {
      this.products1 = products || [];
      this.isNewData1 = true;
      setTimeout(() => this.isNewData1 = false, 750)
    },

    setProducts2(products) {
      this.products2 = products || [];
      this.isNewData2 = true;
      setTimeout(() => this.isNewData2 = false, 750)
    },

    setProducts3(products) {
      this.products3 = products || [];
      this.isNewData3 = true;
      setTimeout(() => this.isNewData3 = false, 750)
    },

    async removeProduct(params) {
      const res = await asklessClient.delete({
        route: 'product',
        query: {
          'id': params.id
        },
      })
      if(res.isSuccess()){
        this.$buefy.snackbar.open({
          message: params.name + ' removed',
          duration: 500,
          actionText: null
        })
      }else{
        this.$buefy.snackbar.open({
          message: res.error.code + ': '+res.error.description,
          duration: 3000,
          actionText: null
        })
        console.error(res.error.code + ': '+res.error.description);
      }
    },

    async addProduct() {
      const res = await asklessClient.create({
        route: 'product',
        body: {
          'name': this.productNameCtrl,
          'price': this.productPriceCtrl
        }
      })
      if(res.isSuccess()){
        this.$buefy.snackbar.open({
          message: this.productNameCtrl + ' created',
          duration: 500,
          actionText: null
        })
      }else{
        this.$buefy.snackbar.open({
          message: res.error.code + ': '+res.error.description,
          duration: 3000,
          actionText: null
        })
        console.error(res.error.code + ': '+res.error.description);
      }

      this.productPriceCtrl = '';
      this.productNameCtrl = '';

    }

  },
  data(){

    return {
      currentOwnClientId: null,
      listening1: null,
      listening2: null,
      listening3: null,
      products1: [],
      products2: [],
      products3: [],
      isNewData1: false,
      isNewData2: false,
      isNewData3: false,
      search: '',
      productNameCtrl: '',
      productPriceCtrl: ''
    }

  }
}
</script>

<style scoped>

  .routeTitle{
    margin-top: 20px;
    font-weight: normal;
    text-align: center
  }


</style>
