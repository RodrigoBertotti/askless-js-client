# Askless - cliente em JavaScript

:checkered_flag: [English (Inglês)](README.md)

Framework que facilita criar servidores para aplicativos em Flutter e JavaScript possibilitando:

- :handshake: realizar uma conexão websocket para troca de dados que: 
 
    - :vibration_mode: suporta integração com streams no cliente em Flutter
  
    - :computer: suporta clientes JavaScript: Web e Node.js
  
    - :arrow_right_hook: realiza o reenvio de dados em caso de instabilidade
    da conexão do cliente

    - :label: trata múltiplas e idênticas requisições de `listen` vindas do mesmo cliente como uma só pelo servidor

- :pencil2: criar as próprias operações CRUD com qualquer banco de dados que você preferir (**C**reate, **R**ead, **U**pdate e **D**elete)

- :no_entry: restringir o acesso do cliente com as operações CRUD

- :mega: notificar em tempo real clientes que estão ouvindo por mudanças de uma rota, podendo ser:
    
    - :no_pedestrians: apenas clientes específicos irão receber os dados
    
    - :heavy_check_mark: todos os clientes irão receber os dados

- :lock: aceitar e recusar tentativas de conexão

Este é lado cliente em JavaScript, 
[clique aqui](https://github.com/WiseTap/askless/blob/master/README_PORTUGUES.md) para
o lado servidor em Node.js.

## Material para referência
*  [Documentação](documentation/portugues_documentacao.md)
*  [chat (exemplo)](example/chat-js/index.js): Troca de mensagens instantâneas entre as cores azul e verde.
*  [catalog (exemplo)](example/catalog-js/index.js): Simulação de múltiplos usuários alterando e removendo produtos de um catálogo.
*  [Começando (servidor)](https://github.com/WiseTap/askless/blob/master/README_PORTUGUES.md)

## Começando

![Alt Text](example/tracking-web/tracking-web-client.gif)

O "Começando" é um exemplo para um cliente em Node.js,
pode ser facilmente mudado para SPA's (Vue, Angular, React) ao simplesmente
modificar como a biblioteca é importada (passo 3).

1 - Primeiramente crie o servidor, [clique aqui](https://github.com/WiseTap/askless/blob/master/README_PORTUGUES.md) e 
siga as instruções do servidor na seção "Começando"

2 - Realize a instalação

    npm install askless-js-client --save
    
3 -  Importe usando ES5 ou ES6:

ES5:

    // Se você vai executar no navegador
    const AsklessClient = require("askless-js-client/web") 
    
    // Se você vai executar como um cliente Node.js
    const AsklessClient = require("askless-js-client/node") 

ES6:

    import {AsklessClient} from "askless-js-client/web";
    
    //ou
    
    import {AsklessClient} from "askless-js-client/node";

4 - Crie uma instância do cliente Askless e exporte para 
todo o seu projeto:

    export const asklessClient = new AsklessClient();

5 - Inicialize o servidor informando o endereço IPv4 da rede local obtido
e a porta (padrão: 3000).


6 - Realize a conexão com o servidor com `asklessClient.connect()`
    
Exemplo:

    asklessClient.init({
        serverUrl: 'ws://192.168.2.1:3000',
    });
    asklessClient.connect();   


7 - Obtenha atualizações de dados em tempo real
 
    this.listening = asklessClient.listen({
        route: 'product/tracking',
        
        listen: data => {
            console.log("NEW DATA RECEIVED: ");
            console.log(data);
            //todo: atualizar texto na tela
        },
    });

8 - Envie dados ao servidor quando o usuário clicar no botão
 
    asklessClient.create({
        route: 'product/customerSaid',
        body: 'I\'m waiting'
    });

9 - Precisamos parar de ouvir por dados na rota `product/customerSaid` em algum lugar da nossa 
aplicação, neste exemplo vamos parar de receber depois de 120 segundos, mas você
parar de ouvir para essa rota quando o usuário mudar de tela

    setTimeout(() => {
        this.listening.close();
        console.log("Stopped listening");
    }, 120 * 1000);


Projeto pronto! Agora é só executar :)

Pelos links, você também pode visualizar esse projeto completo 
da seção "Começando" do [cliente em JavaScript](example/tracking-ts/index.ts)
e do [servidor em Node.js](https://github.com/WiseTap/askless/blob/master/example/tracking-ts/index.ts).


## Issues

Sinta-se livre para abrir uma issue sobre:

- :grey_question: dúvidas

- :bulb: sugestões

- :page_facing_up: melhorias na documentação

- :ant: potenciais bugs


As issues devem ser escritas de preferência em inglês,
assim, todos poderão entender :grin:

## Licença

[MIT](LICENSE)
