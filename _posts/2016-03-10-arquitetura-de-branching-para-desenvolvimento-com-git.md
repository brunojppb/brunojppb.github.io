---
layout: post
author: Bruno Paulino
title: Arquitetura de branching para desenvolvimento com Git
permalink: entries/2-arquitetura-de-branching-para-desenvolvimento-com-git
keywords: git,gitflow,branch,workflow,desenvolvimento,programação
meta_description: While creating mobile applications, one of the the main features that we can explore is the Notification.
---

Visando implementar um padrão mais sólido e fácil de gerenciar nossos repositórios na [Policia Militar da Paraíba](http://www.pm.pb.gov.br), resolvemos adotar uma arquitetura de branching baseada no artigo de [Vincent Driessen](http://nvie.com/posts/a-successful-git-branching-model/) o qual já foi testado e aprovado em diversas empresas mundo a fora. Esse artigo será, praticamente, uma tradução da nossa fonte, com o objetivo de facilitar o aprendizado e a intergração de novos membros em nossa equipe. Esse artigo exige que o leitor possua conhecimentos sobre Git. Se ainda não conhece Git, recomento a leitura do livro de [Learn Enough Git to Be Dangerous](https://www.learnenough.com/git-tutorial) escrito por [Michael Hartl](http://www.michaelhartl.com/) o qual possui uma didática incrível para iniciantes. O livro é gratuito o pode ser lido no próprio navegador. Se preferir um livro em Português, o leitor pode adquirir o livro [Controlando versões com Git e Github](https://www.casadocodigo.com.br/pages/sumario-git-github) disponível na Casa do Código. Não li esse livro, porém recebi boas recomendações.

### Repositório Central

Em nosso repositorio central(origin), temos duas branches que sempre existirão no ciclo de vida de nossas aplicações. Elas são:

- **master**
- **develop**

A branch **origin/master** será sempre nosso código-fonte que está em produção.

em paralelo a **master** branch, teremos a branch **origin/develop** que sempre refletirá todas as novas funcionalidades implementadas para o proximo release. Sempre que tivermos uma versão estável em origin/develop, estamos prontos para realizar um merge em **origin/master** colocando uma tag com o número do release.

<span style="text-align: center; display: block; font-weight: bold">
   Ilustração da arquitetura de branching
</span>

![Ilustração da arquitetura de branching](/assets/images/posts/git_branch_architecture.jpg)
Fonte: [A successful Git branching model](http://nvie.com/posts/a-successful-git-branching-model/)

### Branches de suporte

enquanto as branches **origin/maste**r e **origin/develop** são as principais e sempre estarão presentes, nós usaremos as branches de suporte para implementar novas funcionalidades, corrigir eventuais problemas que surgirem em produção e criar novos releases. Essas branches sempre terão um tempo de vida limitado, pois iremos removê-las assim que não forem mais necessárias. As branches que podemos usar serão:

- **Features branches** (branches de implementação de novas funcionalidades)
- **Release branches** (branches criadas para novos releases(entregas) para produção)
- **Hotfix branches** (branches criadas para correções de bugs existentes em produção)

Cada branch dessa tem um propósito específico e seguem regras que informam de onde devem ser criadas e para onde devem ser mergidas(target branches). Iremos descrever um pouco sobre qual o papel de cada tipo de branch e como elas devem se comportar.

### Feature Branches

1. Podem ser criadas apartir de:
  - **develop**
2. Devem ser mergidas em:
  - **develop**
3. Convenção para nomeação das branches
  - **QUALQUER NOME**, exceto **master**, **develop**, __release-*__ ou __hotfix-*__.

Feature branches são utilizadas para desenvolvimento de novas funcionalidades para um futuro release(entrega). O objetivo principal é que essa branch exista enquanto essa nova funcionalidade estiver em desenvolvimento onde, no futuro, será mergida na branch **origin/develop** para que essa nova funcionalidade esteja disponível em um novo release o será descartada em caso dessa nova funcionalidade não seja mais necessária.
**Features Branches** geralmente não estarão disponíveis no repositório central(origin) e sim no repositório local do desenvolvedor.

##### Criação de uma Feature Branch
quando iniciarmos nosso trabalho em uma nova funcionalidade, iremos criar essa nova branch apartir de **develop** com o seguinte comando:

```shell
  $ git checkout -b feature-name develop
  # criação da branch 'feature-name'
  # e checkout para 'feature-branch'
```

Agora estamos aptos a criar nossa funcionalidade nessa nova branch. Ao termino da implementação da nova funcionalidade, devemos mergir nossas modifições em **develop** para um futuro release. podemos seguir os seguintes comandos:

```shell
  $ git add -A
  $ git commit -m "Mensagem objetiva e direta sobre a funcionalidade"
  $ git checkout develop
  # checkout na branch develop
  $ git pull
  # Recuperando novas atualizações que estão em origin/develop(repositório central) e mergindo em nossa branch develop local
  $ git merge --no-ff feature-name
  # mergindo nossa feature branch em develop usando o parametro --no-ff para não perdermos informações sobre o histórico de commits da nossa feature branch. O histórico não é perdido, mas sim mergido na branch develop onde, em uma futura consulta, irá sugerir que trabalhamos diretamente em develop, onde não estaria correto.
  $ git branch -d feature-name
  # excluindo a nossa feature-branch localmente
  git push origin develop
  # enviando nossas modificações que incluimos em develop para o repositório central(origin/develop)
```

Usando o parametro **--no-ff** nos ajudará a visualizar o histórico de commits que foram implementados nessa nova funcionalidade. mantendo o histórico dessa branch separado de **develop**, facilitando uma futura consulta.

### Release Branches

1. Podem ser criadas apartir de:
  - **develop**
2. Devem ser mergidas em:
  - **develop** e **master**
3. Convenção para nomeação das branches
  - __release-*.__

Release branches serão nossas pontes entre **develop** e **master**, onde iremos corrigir os pequenos detalhes que passaram despercebidos. Essas branches serão a nossa preparação para o próximo release de produção.

Realizando essas correções na **release branch**, nossa **develop branch** ficará livre para receber novas funcionalidades(feature branches) para próximas releases.

Para determinarmos o momento de criação de uma release branch, podemos adotar o seguinte parâmetro:

- *Quando a branch develop estiver preparada para um novo release;*

No momento em que criamos a nossa **Release Branch**, devemos criar um versão que será usada para proxima release.


Relase Branches são criadas apartir de develop. Por exemplo, se nossa versão atual em produção for **1.1.5** e a nossa branch **develop** está pronta para um próximo release, nós decidimos que a proxima verão será a **1.2**. Então, criaremos a **release branch** que refletirá essa nova versão.

```shell
  $ git checkout -b release-1.2 develop
  # criação da branch 'release-1.2' apartir de develop
  # e checkout para 'release-1.2'
  # Apartir de agora, podemos fazer as correções necessárias e trabalhando na release branch
  $ git commit -a -m "messagem objetiva"
```

É proibido adicionar grandes funcionalidades nessa branch, onde só é permitido a correção de erros e pequenos ajustes. Se precisamos adicionar novas funcionalidades, devemos criar uma **feature branch** e mergir em develop ao termino, onde essa nova funcionalidade precisará esperar o próximo release.

##### Finalizando trabalhos na Release Branch

Quando finalizarmos todo o nosso trabalho de correções e ajustes na Release Branch, precisamos mergir essa branch na **master**(branch de produção). Como todo commit na **master** é um novo release por padrão, precisamos criar uma [Tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) para uma futura referencia em nosso histórico de versões. Uma tag nada mais é que um numero de versão que facilitará nosso controle em produção. Após a criação da **tag** em **master**, precisamos mergir nossas modificações feitas na release branch em **develop**. Assim, teremos todas essas correções ja implementadas em futuros releases. Para realizar esse processo, podemos executar os seguintes comandos:

```shell
$ git checkout master
# checkout na branch master
$ git pull
# recuperando atualizações da master que estão no repo central
$ git merge --no-ff release-1.2
# mergindo nova release branch em master
$ git tag -a 1.2
# criação da tag para esse novo release em produção
$ git push origin master
# Atualizando a branch master no repositorio central
# Onde refletirá o novo release para produção

# Agora precisamos atualizar a branch develop com as
# correções feitas na release branch
$ git checkout develop
# chechout na branch develop
$ git pull
# recuperando atualizações de develop que estão no repo central
$ git merge --no-ff release-1.2
# mergindo nossas modificações da branch release-1.2 em develop
# pode ser que ocorram conflitos nesse merge. Caso ocorra,
# resolva os conflitos e faça um commit
$ git push origin develop
# atualizando branch develop no repositorio central(origin)
# Agora podemos deletar a branch release-1.2
$ git branch -d release-1.2
```

##### Hotfix Branches
1. Podem ser criadas apartir de:
  - **master**
2. Devem ser mergidas em:
  - **develop** e **master**
3. Convenção para nomeação das branches
  - __hotfix-*__.

**Hotfix Branches** são bem parecidas com **Release Branches**, pois são criadas para serem devolvidas para produção(**master**), porém são branches criadas sem planejamento, provenientes de bugs encontrados em produção. Basicamente, são criadas quando temos um bug severo em produção e precisa ser corrigido de **imediato**. O trabalho na Hotfix Branch não impede a continuação do trabalho de outros desenvolvedores que estão utilizando develop como base, sendo assim, develop continua livre.

##### Criando Hotfix Branches
Hotfix Branches são criados apartir da **master**. Pegando como exemplo a versão **1.2** como atual em produção na **master**, teremos os seguintes comandos:

```shell
$ git checkout -b hotfix-1.2.1 master
# criando hotfix branch apartir da master, criando um nova versão para essa correção
# Agora podemos trabalhar na correção do bug encontrado em produção
$ git commit -m "Mensagem objetiva"
```

##### Finalizando correções na Hotfix Branch
Ao termino da correção do **bug**, precisamos mergir essas alterações na **master**, porém tambem precisamos mergir essas novas correções em **develop** para inclusão em novos releases. podemos executar os seguintes comandos:

```shell
$ git checkout master
$ git pull
$ git merge --no-ff hotfix-1.2.1
# mergindo alterações da hotfix branch na master
$ git tag -a 1.2.1
# Criando nova tag para refletir a nova versão com as correções

# Agora precisamos adicionar essas correções em develop
$ git checkout develop
$ git pull
$ git merge --no-ff hotfix-1.2.1

# pro fim, remova a hotfix branch
$ git branch -d hotfix-1.2.1
```

**ATENÇÃO**: Se existir uma **RELEASE BRANCH** na hora de mergir a **hotfix branch** na **master**, devemos mergir essa **hotfix branch** na **atual release branch**, ao invés de **develop**. Como ao termino do merge da **release branch** na **master**, temos que mergir a **release branch** em **develop**, **develop** receberá essas atualizações. Se por acaso nossa **develop** branch precisar dessas correções **IMEDIATAMENTE**, podemos mergir a hotfix branch diretamente em develop sem problemas.