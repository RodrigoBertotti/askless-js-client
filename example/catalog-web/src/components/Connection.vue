<template>

  <a v-on:click="clickItem()"
       style="width: 100%; padding: 10px; height: 70px"
       v-bind:class="{
        'not-selected':    !isSelected,
        'is-connected':     isSelected && isConnected,
        'is-connecting':    isSelected && isConnecting,
        'is-disconnected':  isSelected && isDisconnected,
      }"
  >
    {{description}}
  </a>

</template>

<script>

import {asklessClient} from "@/AsklessClient";

export default {
  name: 'Connection',
  props: {
    isSelected: Boolean,
    description: String,
  },
  data () {

    return {
      connectionStatus: '',
    };
  },
  methods: {
    clickItem(){
      this.$emit('click');
    }
  },
  computed: {
    isConnecting() {
      if(this==null)
        return false;

      return this.connectionStatus === 'CONNECTION_IN_PROGRESS'
    },
    isConnected () {
      if(this==null)
        return false;

      return this.connectionStatus === 'CONNECTED_WITH_SUCCESS'
    },
    isDisconnected () {
      if(this==null)
        return true;

      return this.connectionStatus === 'DISCONNECTED'
    },
  },

  created() {
    asklessClient.addOnConnectionChange({
          listener: (connectionStatus) => {
            this.connectionStatus = connectionStatus;
          }
    });
  }
}

</script>

<style scoped>

  .not-selected {
    background: darkgrey;
    color: black
  }

  .is-disconnected {
    background: red;
    color: white
  }

  .is-connecting {
    background: blue;
    color: white
  }

  .is-connected {
    background: green;
    color: white
  }



</style>
