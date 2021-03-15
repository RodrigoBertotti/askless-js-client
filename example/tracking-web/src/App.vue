<template>
  <div id="app" style="margin-top: 200px">
    {{text}}
    <br>
    <br>
    {{connectionState}}
    <br>
    <br>
    <button v-on:click="send">I'm waiting</button>
  </div>
</template>

<script>
// Debug only:
// import {AsklessClient} from "askless-js-client/web-debug";
// OR
// const AsklessClient = require("askless-js-client/web-debug").AsklessClient;

// Recommended:
// import {AsklessClient} from "askless-js-client/web";
// OR
// const AsklessClient = require("askless-js-client/web").AsklessClient;


import { AsklessClient, NewDataForListener} from "../../../dist/askless-js-client/web";

export default {
  name: 'App',
  components: {

  },
  data () {
    return {
      text: String,
      connectionState: String,
      listening: NewDataForListener
    }
  },
  beforeDestroy() {
    this.listening.close();
  },
  created() {
    AsklessClient.instance.init({
      serverUrl: 'ws://192.168.2.1:3000',
      projectName: 'tracking-ts',
    });
    console.log('Started');
    this.text = 'Just a second...';
    this.connectionState = '';

    this.listening = AsklessClient.instance.listen({
      route: 'product/tracking-ts',
      listener: data => {
        console.log("NEW DATA RECEIVED: ");
        console.log(data);
        this.text = data.output;
      },
    });

    AsklessClient.instance
      .addOnConnectionChange({
        listener: (connection) => {
          console.log("connection changed: "+connection);
          this.connectionState = connection
          if(connection === "DISCONNECTED" && !this.text.toString().includes('Client stopped listening after')){
            this.text = '';
          }
        }
      })

    const stopListeningAfterSec = 120;
    setTimeout(() => {
      this.listening.close();
      const msg = 'Client stopped listening after '+stopListeningAfterSec+' seconds';
      console.log(msg);
      this.text = msg;
    }, stopListeningAfterSec * 1000);
  },
  methods: {
    send(){
      AsklessClient.instance
          .create({
            route: 'product/customerSaid', body: 'I\'m waiting'
          }).then((res) => {
            if(res.isSuccess())
              console.log('Success');
            else
              console.error(res.error);
          });
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
