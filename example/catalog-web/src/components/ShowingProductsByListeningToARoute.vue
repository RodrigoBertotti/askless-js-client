<template>
  <div>
    <div v-for="product in products" :key="product.id" style="display: flex; flex-direction: row; margin-top: 20px; align-items: center">
      <b-button size="is-small" icon-left="delete" v-on:click="removeProduct({id: product.id, name: product.name})"></b-button>
      <div style="margin-left: 10px" :style="isNewData ? {'font-weight': 'bold'} : {'font-weight': 'normal'}">
        {{ '$' + product.price + ' - ' +product.name }}
      </div>
    </div>
    <span v-if="products.length === 0" style="text-align: center; align-items: center; margin-top: 50px">
      No registered products
  </span>
  </div>
</template>

<script>
export default {
  name: "ShowingProductsByListeningToARoute",
  props: {
    products: Array,
    isNewData: Boolean
  },
  methods: {
    removeProduct(params){
      this.$emit('removeProduct', params)
    }
  }
}
</script>

<style scoped>

</style>
