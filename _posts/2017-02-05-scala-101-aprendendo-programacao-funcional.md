---
layout: post
author: Bruno Paulino
title: "Scala 101: Aprendendo Programação Funcional"
permalink: entries/6-scala-101-aprendendo-programacao-funcional
keywords: scala,funcional,programação,computação
meta_description: Trabalhando no journi, decidi ajudar no backend e aprender Scala foi uma das melhores coisa que fiz.
---

Trabalhando no [journi](https://www.journiapp.com/) como iOS developer, em poucos meses, percebi que a melhor forma de aprender e evoluir rápido é usando o que você precisa no dia-a-dia. Todo dia um desafio novo, um nova funcionalidade para implementar e forma nova de aprender algo. Agora chegou a hora de trabalhar em nosso backend. Como a alguns amigos sabem, eu tenho trabalhado com Ruby on Rails em meu trabalho passando, onde adquiri um bom conhecimento no assunto. Porém nosso backend aqui na empresa é escrito em Scala. Um linguagem que trás o melhor dos 2 mundos: Orientação a Objeto e Programação Funcional.

Enquanto aprendo *on the fly* todos os dias na empresa, resolvi comprar o livro [Scala in Action](https://www.amazon.com/Scala-Action-Covers-2-10/dp/1935182757) para aprender melhor os conceitos da linguagem, como também criar uma série de posts durante a leitura. Isso vai facilitar meu aprendizado e ao mesmo tempo poderei compartilhar com você que está lendo isso aqui agora e provavelmente está interessado em aprender um pouco mais sobre Scala.

### Sobre a Linguagem

Scala é uma linguagem multiparadigma desenvolvida por [Martin Odersky](https://twitter.com/odersky) em seu laboratório na EPFL(École Polytechnique Fédérale de Lausanne) na Suiça em 2001. O principal objetivo da linguagem é expressar padrões conhecidos de programação de forma concisa e eficiente, integrando funcionalidades do estilo orientado a objeto e programação funcional. Outra grande vantagem da linguagem é rodar em cima da JVM(Java Virtual Machine) a qual é extemamente eficiente e também poder usar todas as bibliotecas Java disponíveis, sendo uma linguagem 100% compatível com as funcionalidades Java.

### Instalação

Como Scala roda em cima da JVM, nós precisamos do [Java SDK](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html) instalado. Após a instalação do Java SDK, baixe o [Instalador Scala](http://www.scala-lang.org/download/) e prossiga com a instalação. Abra seu terminal e verifique a versão instalada com o comando
```shell
$ scala -version
```
![versão atual](https://i.imgur.com/HLMm23g.png)
### Scala REPL

Como programador Ruby, estou acostumado a ter um console rápido onde posso escrever um código rápido e testa-lo sem precisar instalar uma IDE e criar uma aplicação, em Scala não é diferente. com o Scala REPL(read-evaluate-print loop) podemos executar código Scala direto em nosso terminal e ter resposta imediata. Isso facilita bastante o uso da linguagem para aprendizado e para testes rápidos.

Abra seu terminal e execute o comando:
```shell
$ scala
```
Logo você verá seu console aguardando seu input e cada linha adicionada é avaliada imediatamente trazendo sua resposta. #rubyFeelings

![Scala REPL](https://i.imgur.com/B64545k.png)

## Declarando Variáveis

podemos declarar variaveis de 2 formas:
- var: usada para variáveis mutáveis, ou seja, quando você pode modificar;
- val: usada para variáveis imutáveis, ou seja, depois de declarada, não podemos modificar seu valor.

Vejamos os exemplos:
```scala
var nomeMutavel = "John Due"
// vamos modificar nomeMutavel
nomeMutavel = "Felix Roger"

// Agora usando val, se tentarmos modificar, teremos um erro:
val nomeImutavel = "Bruno Paulino"
nomeImutavel = "Paulino Bruno"
// error: reassignment to val
```

Vejam que podemos suprir o tipo, pois Scala infere o tipo basedo no valor do lado direito
```scala
// Declarando tipo
val nome: String = "Bruno"
// Usando inferencia
val sobrenome = "Paulino"
```

## Definindo funções

definir funções em Scala é bem parecido com Java ou Ruby. Com algumas diferenças é claro. Vamos para os exemplos:
```scala
// Na definição da função soma temos 2 parametros: a e b, onde definimos seus tipos separados por :(dois pontos) e o tipo de retorno(que também é opcional) Int.
// Em seguida temos corpo da função. reparem que não utilizamos a palavra chave 'return' pois em Scala a última linha executada é retornada e o tipo de retorno da função(se não declaramos) é inferido.
def soma(a: Int, b: Int): Int { a+b }

//executando a função:
val resultado = soma(1,1)
println(resultado)
// 2
```

### Funções como Parâmetro
Em Scala, funções também são objetos, logo podemos passar funções como parâmetros em outras funções. Vejamos um exemplo utilizando a função map em listas, a qual recebe uma função que receba um parâmetro e retorne o mesmo tipo do parâmetro:
```scala
// Função que eleva um número ao quadrado
def aoQuadrado(a: Int): Int = { a * a }

val lista = List(1,2,3,4,5)
val resultado = lista.map(aoQuadrado)
// List[Int] = List(1, 4, 9, 16, 25)
```

### Controle de Fluxo
Usar *if* e *else* em scala é bem parecido como em outras linguagens, porém temos um benefício: valor de retorno. Vamos ao exemplo:
```scala
val idade = 20
val quantidade = if (idade > 18) 20 else 15
```
Usando *for*, *while* e *do-while* não é muito diferente do Java, porém em Scala temos compreensão de lista, que torna nosso loop ainda mais poderoso. Podemos adicionar filtros na cláusula *for* e executarmos apenas o necessário. Vamos ao exemplo:
```scala
val lista = List(5,6,7,8,9)
for(
  numero <- lista;
  dobro = numero * 2;
  if(dobro > 10)
) println(dobro)
// 12, 14, 16, 18
```
