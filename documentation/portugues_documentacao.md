# Documentação

:checkered_flag: [English (Inglês)](english_documentation.md)

Documentação do cliente JavaScript. 
[Clique aqui](https://github.com/WiseTap/askless/blob/master/README_PORTUGUES.md) 
para acessar o lado servidor em Node.js

## Material para referência
*  [Começando](README_PORTUGUES.md): Referente ao cliente JavaScript.
*  [Começando (servidor)](https://github.com/WiseTap/askless/blob/master/documentation/portugues_documentacao.md#create): Referente ao servidor em Node.js.
*  [chat (exemplo)](example/chat-js/index.js): Troca de mensagens instantâneas entre as cores azul e verde.
*  [catalog (exemplo)](example/catalog-js/index.js): Simulação de múltiplos usuários alterando e removendo produtos de um catálogo.

## `init(...)` - Configurando o cliente

O cliente pode ser inicializado com o método `init`.

### Parâmetros

#### serverUrl

A url do servidor, deve ser iniciada com `ws://` ou `wss://`. Exemplo: `ws://192.168.2.1:3000`.

#### projectName
Nome para esse projeto. Se `!= null`: o campo projectName no 
servidor deve conter o mesmo nome (opcional).

#### logger

Permite customizar a exibição de logs internos do AsklessClient 
e habilitar e desabilitar o logger padrão (opcional). 

##### Parâmetros:

###### useDefaultLogger
Se `true`: o logger padrão será utilizado (opcional). Defina como `false` em um ambiente de produção. Padrão: `false`

###### customLogger
Permite criar a própria implementação do logger (opcional). Deixe `null` em um ambiente de produção

##### Exemplo

    // Reutilize essa instância em diferentes páginas do seu App
    export const asklessClient = new AsklessClient(); 

...

    asklessClient.init({
        serverUrl: 'ws://192.168.2.1:3000',
        projectName: 'MyApp',
        logger: {
            useDefaultLogger: false,
            customLogger: (message, level, additionalData) => {
                if(level !== 'debug'){
                    console.log(level + ": "+ message);
                    if(additionalData != null){
                        console.log(additionalData);
                    }
                }
            }
        }
    });

## `connect(...)`- Se conectando com o servidor

Tenta realizar a conexão com o servidor.

No lado do servidor, você pode implementar [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/portugues_documentacao.md#grantconnection)
para aceitar ou recusar tentativas de conexão provenientes do cliente.

Retorna o resultado da tentativa de conexão.

### Parâmetros

#### `ownClientId`
O ID do usuário definido na sua aplicação. Não deve ser `null` quando o usuário estiver realizando login,
do contrário, deve ser `null` (opcional).

#### `headers`
Permite informar o token do respectivo `ownClientId` (e/ou valores adicionais)
para que o servidor seja capaz de aceitar ou recusar a tentativa de conexão (opcional).

### Exemplo

    asklessClient.connect({
        ownClientId: ownClientId,
        headers: {
            'Authorization': 'Bearer abcd'
        }
    }).then((response) => {
        console.log(response.isSuccess());
    });

### Aceitando ou recusando uma tentativa de conexão

No lado do servidor, você pode implementar [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/portugues_documentacao.md#grantconnection)
para aceitar ou recusar tentativas de conexão provenientes do cliente.

#### Boa prática

*Antes de ler essa subseção, é necessário antes ler a seção [create](#create).*

Uma maneira simples de autenticar o usuário seria informando o e-mail
e senha no campo `header` do método `connect`:
 
    // Não recomendado
    asklessClient.connect({
        headers: {
            "email" : "me@example.com",
            "password": "123456"
        }
    });
 
Porém, dessa maneira
que o usuário precisaria ficar informando o e-mail e senha toda vez que 
acessar a aplicação.

Para evitar isso é **recomendado** que seja criado uma rota 
que permita informar o e-mail e senha na requisição e
receber como resposta o respectivo **ownClientId** e um **token**.
Desta maneira, este token pode ser informado no campo `headers` de `connect`.

#### Exemplo
    
    // 'token' é um exemplo de uma rota no lado do servidor
    // que permite solicitar um token quando é informado um e-mail e senha
    asklessClient.create({ 
        route: 'token', 
        body: {
            'email' : 'me@example.com',
            'password': '123456'
        }
    }).then((loginResponse) => {
       if(loginResponse.isSuccess()){        
       
           // Salve o token localmente:
           myLocalRepository.saveToken(
               loginResponse.output['ownClientId'], 
               loginResponse.output['Authorization']
           );
           
           // Reconecte informando o `token` e `ownClientId`
           // obtidos na última resposta
           asklessClient.connect({
               ownClientId: loginResponse.output['ownClientId'],
               headers: {
                   'Authorization' : loginResponse.output['Authorization']
               }
           }).then((connection) => {
               if(connection.isSuccess()){
                   console.log("Connected as me@example.com!");
               }else{
                   console.log("Failed to connect, connecting again as unlogged user...");
                   asklessClient.connect();
               }
           })
       }
    });

## `init` e `connect`
Onde pode ser chamado `init` e `connect`? 

`init` deve ser chamado *apenas uma vez* no início da aplicação, por isso,
é recomendado que a inicialização ocorra em `main.dart`.

`connect` 
 pode ser chamado várias vezes, visto que o usuário pode fazer login e logout.

| Local                                                                                                                                               |     `connect`      |       `init`       |
| --------------------------------------------------------------------------------------------------------------------------------------------------: |:------------------:|:------------------:|
| main.dart                                                                                                                                           | :heavy_check_mark: | :heavy_check_mark: |
| Quando o usuário faz login                                                                                                                          | :heavy_check_mark: | :x:                |
| Após um disconnect (exemplo: usuário fez logout) *                                                                                                  | :heavy_check_mark: | :x:                |
| override `build` de um widget                                                                                                                       | :x:                | :x:                |
| override `init` de um widget qualquer compartilhado                                                                                                 | :x:                | :x:                |
| override `init` de um widget que aparece apenas **uma única vez**, quando o App é aberto  (exemplo: em um arquivo `carregando_app.dart`)            | :heavy_check_mark: | :heavy_check_mark: |

\* Após um logout, pode ser necessário que o usuário leia dados do servidor,
por isso, mesmo após logout pode ser feito um `connect` com
`ownClientId` sendo `null`.

## `reconnect()` - Reconectando
Reconecta com o servidor utilizando as mesmas credenciais da conexão
anteriores informadas em `connect`.

Retorna o resultado da tentativa de reconexão.
 
## `disconnect()` - Desconectando do servidor
Interrompe a conexão com o servidor e limpa as credenciais `headers` e `ownClientId`.

## `connection`
Obtém o status da conexão com o servidor.

## `disconnectReason`
Quando desconectado, indica o motivo da falta de conexão.

## `addOnConnectionChange(...)`

### Parâmetros

`listener` Adiciona um `listener` que será chamado toda vez que o status
da conexão com o servidor mudar.

`runListenerNow` Padrão: true. Se `true`: o `listener` é chamado
logo após ser adicionado (opcional).

## `removeOnConnectionChange(listener)`
Remove o `listener ` adicionado.

## `create(...)`
 Cria um dado no servidor.

#### Parâmetros

  `body` O dado a ser criado.

  `route` O caminho da rota.

  `query` Dados adicionais (opcional).

  `neverTimeout ` Padrão: `false` (opcional). Se `true`: a requisição será realizada quando possível,
 não havendo tempo limite. Se false: o campo `requestTimeoutInSeconds` definido no servidor
 será o tempo limite.

#### Exemplo
 
    asklessClient
        .create({
            route: 'product',
            body: {
                'name' : 'Video Game',
                'price' : 500,
                'discount' : 0.1
            }
        }).then((response) => {
            console.log(response.isSuccess() ? 'Success' : 'Error');
        });
      

## `read(...)`
 Obtém dados apenas uma vez.

#### Parâmetros

 `route` O caminho da rota.

 `query` Dados adicionais (opcional), aqui pode ser adicionado um filtro para indicar ao
 o servidor quais dados esse cliente irá receber.

 `neverTimeout` Padrão: false (opcional). Se true: a requisição será realizada quando possível,
 não havendo tempo limite. Se false: o campo `requestTimeoutInSeconds` definido no servidor
 será o tempo limite.

#### Exemplo
 
    asklessClient
        .read({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            neverTimeout: true
        }).then((res) => {
            for (let key in res.output) {
                if(res.output.hasOwnProperty(key)){
                    console.log(res.output[key]);
                }
            }
        });
      

## `listen(...)`
 Obtém dados em tempo real com `stream`. 

 Retorna um [Listening](#listening).


### Parâmetros

 `route` O caminho da rota.

 `query` Dados adicionais (opcional), aqui pode ser adicionado um filtro para indicar ao
 o servidor quais dados esse cliente irá receber.

 `listener` A função que será executada quando houver mudanças na rota. 
 Possui um parâmetro `newRealtimeData`, este parâmetro é um objeto que 
 contém `output` e 


### Exemplo

    const listeningForNewGamingProducts = asklessClient
        .listen({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            listener: (newRealtimeData:NewDataForListener) => {
                for (let outputKey in newRealtimeData.output) {
                    if(newRealtimeData.output.hasOwnProperty(outputKey)){
                        console.log("product has been added: ");
                        console.log(newRealtimeData[outputKey]);
                    }
                }
            }
        });
        
**importante**: Parar de ouvir a rota
    
 É necessário parar de ouvir a rota quando for apropriado,
 tal como quando o usuário vai para outra tela da aplicação:
    
    listeningForNewGamingProducts.close();

## `update(...)`
 Atualiza um dado no servidor.

#### Parâmetros

 `body` O dado inteiro ou seus respectivos campos que será(ão) atualizado(s).

 `route` O caminho da rota.

 `query` Dados adicionais (opcional).

 `neverTimeout` Padrão: false (opcional). Se true: a requisição será realizada quando possível,
 não havendo tempo limite. Se false: o campo `requestTimeoutInSeconds` definido no servidor
 será o tempo limite.

#### Exemplo

    asklessClient
        .update({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            body: {
                'discount' : 0.8
            },
        }).then((res) => {
            console.log(res.isSuccess() ? 'Success' : 'Error '+res.error.code);
        });

## `delete(...)`
 Remove um dado no servidor.

### Parâmetros

 `route` O caminho da rota.

 `query` Dados adicionais, indique por aqui qual dado será removido.

 `neverTimeout` Padrão: false (opcional). Se true: a requisição será realizada quando possível,
 não havendo tempo limite. Se false: o campo `requestTimeoutInSeconds` definido no servidor
 será o tempo limite.

#### Exemplo

    asklessClient
        .delete({
            route: 'product',
            query: {
                'id': 1
            },
        }).then((res) => {
            console.log(res.isSuccess() ? 'Success' : 'Error '+res.error.code);
        });

## Classes
## `ResponseCli`
A resposta para uma operação no servidor.

### Campos

#### `clientRequestId`
 ID da requisição gerado pelo cliente

#### `output`
 Resultado da operação no servidor.

 Não use esse campo para verificar se houve um erro
 (pois pode ser null mesmo em caso de sucesso),
 em vez disso use `isSuccess()`.

  
#### `isSuccess()`  
Retorna `true` se a resposta é um sucesso

#### `error`  
 Se `isSuccess() == false`: contém o erro da resposta
 
## `Listening`
Observando novos dados a serem recebidos do servidor.
É o retorno do método [listen](#listen).

## Campos

### `close()`
Encerra o envio de dados do servidor para o cliente.

### `setListener(listener)`
Define um novo listener.

