---
layout: post
author: Bruno Paulino
title: "Scala 101: Funções"
permalink: entries/7-scala-101-funcoes
keywords: scala,funcional,programação,computação
meta_description:
  Continuando meus estudos em Scala explorando os conceitos básicos da
  linguagem.
---

Continuando meus estudos em Scala, temos que falar de um conceito muito
importante da linguagem: Funções. Em Scala, funções são tratados como valores
normais como Int e String, ou seja, podemos declarar funções, armazená-las em
variáveis e até passá-las como parâmetro para outras funções. Aqui utilizarei os
exemplos do livro Scala in Action, mostrando como utilizar funções, desde o
básico até casos mais avançados. Abaixo temos o exemplo clássico de como
utilizar funções:

```scala
class UseResource {
  def use(r: Resource): Boolean = { ... }
}
```

A função **_use_** definida a cima é chamada de método, pois é definida dentro
da classe **_UseResource_** e pode causar efeitos colaterais no estado do
objeto. Essa é uma das desvantagens de utilizar métodos ao invés de funções
puras. Vejamos um próximo exemplo:

```scala
val addOne = (x: Int) => x + 1
addOne(2)
// output: 3
```

A grande diferença entre os exemplos citados a cima é que a segunda não modifica
estado, sendo considerada uma função pura.

## Higher-order functions

São as funções que recebem funções como parâmetro e que podem retornar funções
como retorno. Um exemplo disso é a função **_filter_** em listas. Ela recebe uma
função literal e retorna uma lista como os elementos que passaram pelo "filtro".

```scala
val list = Seq(1,2,3,4,5,6,7,8,10)

val result = list.filter(_ % 2 == 0) // _ representa o o primeiro elemento da tupla passada pela função filter
// output: List(2, 4, 6, 8, 10)

// Também poderiamos escrever dessa forma:
val result = list.filter(element => element % 2 == 0)
// ou dessa forma
val filterFunc = (el: Int) => el % 2 == 0
val result = list.filter(filterFunc)
```

## Problemas da Vida Real

Agora aplicando esses conceitos no dia-a-dia, é comum termos o cenário onde
precisamos utilizar um \***\*Resource\*\***, seja ele um arquivo ou um socket na
rede. Sempre que finalizamos a utilização, precisamos fechar esse recurso, de
forma que ele possa ser retomado pelo SO e que seja usado por outra aplicação.
Se não fechamos o recurso, podemos der um caso de memory leak, onde teremos esse
recurso na memória por tempo indeterminado e outros vários problemas. Geralmente
temos o seguinte código ao utilizar um recurso:

```scala
val resource = getResource()
try {
  doSomeCrazyStuff(resource)
} finally {
  resource.dispose()
}
// Perceba que a utilização do catch é opicional em Scala. Veremos Error Handling em outro post
```

Perceba que sempre que você precisar utilizar um recurso, você terá essa
repetição de código para ter certeza que seu recurso seja utilizado
corretamente. Porém e se esquecermos de adicionar o bloco try-finally? Para
evitar repetição, podemos escrever uma função que receba um Resource e uma
função como parâmetros e todo esse boilerplate será evitado:

```scala
def use[A, B <: Resource](resource: Resource)(fn: Resource => A): A = {
  try {
    fn(resource)
  } finally {
    resource.dispose()
  }
}

// Agora podemos usar a função 'use' sem o bloco try-finally
val resource = getResource()
use(resource) {
  resourceToUse =>
  doSomeCrazyStuff(resourceToUse)
}
// o recurso será fechado automaticamente.
```

## Currying

Currying é a técnica de transformar uma função que recebe vários parâmetros em
outra função que recebe apenas um. Um bom exemplo da vida real onde podemos ver
o benefício do currying é a injeção de dependência. Onde não nos preocupamos em
como o objeto foi criado, apenas nos preocupamos em utilizar a instância já
provida pelo injetor.

```scala

trait TaxService {
  def taxIt(productPrice: Double): Double
}

class IOFTaxService extends TaxService {
  // retorna 10% do valor do produto
  def taxIt(productPrice: Double): Double = productPrice * 0.1
}

// taxIt recebe um TaxService o preço de produto.
// Retorna o valor aplicado pelo TaxService injetado.
val taxIt: (TaxService, Double) => Double = (taxService, price) => taxService.taxIt(price)

// utilizando .curried, podemos injetar uma instancia do IOFTaxService.
val taxService = taxIt.curried(new IOFTaxService)

// Agora podemos apenas utilizar a função taxIt sem se preocupar qual o tipo de serviço
// de aplicação de imposto que está sendo utilizado.
val taxToPay = taxService(100)
// output: Double = 10.0
```
