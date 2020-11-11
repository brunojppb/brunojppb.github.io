---
layout: post
author: Bruno Paulino
title: Hardening your server security with Fail2Ban
permalink: entries/hardening-your-server-security-with-fail2ban
keywords: fail2ban,security,linux,server,devops
meta_description: How to protect your server from brute-force attacks and intruders
meta_image: /assets/images/posts/hardening_your_server_security.jpg
---

I was recently checking the access logs from some linux servers I maintain and I was very surprised by the ssh login attempts those servers were facing. My servers have password access disabled by default, so only previously registered ssh keys are allowed to login. But even then, the amount of login attempts was disturbing. Around 500 attempts a day. I had to do something about it.

Talking to my coworkers about it, one of them suggested a tool called [Fail2Ban](https://www.fail2ban.org/wiki/index.php/Main_Page). It runs a background service that monitors the log files on your server and based on suspicious activities, like unsuccessful login attempts, it blocks access from those bad actors by updating firewall rules to reject any connection for their IP addresses.

My first thought was _"I should be careful because I could ban myself and lose access to my server permanently"_. So I started the installation process very carefully. Fortunately, the default configuration only blocks the IP access for 10 minutes, so worst case I would have a few minutes to have coffee. I also started the process in a "trashable" server, so if something goes wrong, I could just throw it away and start anew.

We will customize those settings for a more robust strategy later on here on this post.

## Installing Fail2Ban

Let's get started. The first step is to install Fail2Ban on your server (Ubuntu):

```shell
# Update dependencies
apt update && apt upgrade -y

# install fail2ban
apt install fail2ban
```

Fail2Ban comes with a pretty solid default configuration, but since our goal is to customize it to our needs, they recommend us to copy the default configuration file with the `.local` extension. The reason for this is that if we update Fail2Ban, the original configuration file will get changed and we will lose our custom configuration.

## Put those bad guys in jail

The configuration files are located at `/etc/fail2ban`, so lets go ahead and create a local copy of those files:

```shell
# Copy fail2ban default configuration
cp /etc/fail2ban/fail2ban.conf /etc/fail2ban/fail2ban.local
# Copy fail2ban jail configuration
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Fail2Ban uses the concept of `jails` to monitor specific services like nginx, ssh, apache and so on. Each jail specifies a configuration for a specific application or service running on your server. By default, the `sshd` jail is active.

## Avoid banning specific IP Addresses

To prevent specific IP addresses of being banned, you can create an allow-list in the `fail2ban.local` file. Go ahead and edit the following line with your IP Addresses using space (and/or comma) as a separator:

```shell
# allow IP addresses from your VPN or other servers here
ignoreip = 127.0.0.1/8 ::1 YOU_IP_ADDRESS_HERE
```

## Activating Fail2Ban

Now that we have Fail2Ban installed and pre-configured by default, lets start the service:

```shell
systemctl start fail2ban
```

As soon as you start Fail2Ban, you might already see some bad guys blocked. First lets check which jails are active with the following command:

```shell
fail2ban-client status
# You should see something like this as output:
Status
|- Number of jail:	2
`- Jail list: sshd
```

Ok, so we have Fail2Ban up and running, lets check the `sshd` jail with the following command:

```shell
fail2ban-client status sshd
# You should see something like this as output
Status for the jail: sshd
|- Filter
|  |- Currently failed:	10
|  |- Total failed:	511
|  `- File list:	/var/log/auth.log
`- Actions
   |- Currently banned:	9
   |- Total banned:	77
   `- Banned IP list:	218.255.86.106 222.186.31.83 85.209.48.228 180.166.184.66 218.92.0.220 109.255.185.65 150.158.178.137 111.231.132.94 66.70.130.149
```

In my case, I could immediately see the benefit of Fail2Ban. after a few minutes, I had already several IP addresses banned.

Lets lookup our IP table to see if those IP addresses match with the following command:

```shell
iptables -n -L
# You should see something like this as output
Chain f2b-sshd (1 references)
target     prot opt source               destination         
REJECT     all  --  103.100.211.72       0.0.0.0/0            reject-with icmp-port-unreachable
REJECT     all  --  66.70.130.149        0.0.0.0/0            reject-with icmp-port-unreachable
REJECT     all  --  111.231.132.94       0.0.0.0/0            reject-with icmp-port-unreachable
REJECT     all  --  150.158.178.137      0.0.0.0/0            reject-with icmp-port-unreachable
REJECT     all  --  109.255.185.65       0.0.0.0/0            reject-with icmp-port-unreachable
```

That is great. Fail2Ban is updating our IP filter rules which will prevent connections from those bad actors.

## Changing the defaults

The default configuration blocks those IP addresses for 600 seconds (10 minutes). This is a pretty good start, but we can do better. Ideally, if some of those IP addresses are attempting to connect every 10 minutes, we could block them for a greater timespan or even permanently.

One thing to consider is that if we block IPs permanently, we can potentially increase our IP table lookup time, which means that connecting to our server can become very slow since this list of blocked IPs can grow indefinitely.

To help us with that, Fail2Ban comes with `recidive` which is a jail for its own logs. It works like that:

- It looks into Fail2Ban own logs for banned IP addresses from other jails.
- If those IP addresses are found in the logs more than 5 times in the current day, it blocks them for 1 week.

That sounds like a good strategy. Our IP table won't grow very large (in theory) because in 1 week it will rollback and allow those IP addresses to connect again. If they act in bad faith again, they will be blocked and the cycle repeats.

So let's go ahead and activate `recidive`. Edit the file `/etc/fail2ban/jail.local` (I am using nano, but feel free to use a different text editor). Look for the following code:

```conf
# Jail for more extended banning of persistent abusers
# !!! WARNINGS !!!
# 1. Make sure that your loglevel specified in fail2ban.conf/.local
#    is not at DEBUG level -- which might then cause fail2ban to fall into
#    an infinite loop constantly feeding itself with non-informative lines
# 2. Increase dbpurgeage defined in fail2ban.conf to e.g. 648000 (7.5 days)
#    to maintain entries for failed logins for sufficient amount of time
[recidive]

logpath  = /var/log/fail2ban.log
banaction = %(banaction_allports)s
bantime  = 1w
findtime = 1d
```

Notice that the configuration is already in place. We only need to activate it:

```conf
# ... comments
[recidive]
# Include the next line to enable recidive
enabled = true
logpath  = /var/log/fail2ban.log
banaction = %(banaction_allports)s
bantime  = 1w
findtime = 1d
```

Now we only need to restart the Fail2Ban service with:

```shell
systemctl restart fail2ban
```

Let's check our __fail2ban__ status to see which jails are running after our update:

```shell
fail2ban-client status
# You should see something like this as output
Status
|- Number of jail:	2
`- Jail list:	recidive, sshd
```

Now that `recidive` is active, You can check if some IP addresses were banned for the whole week:

```shell
fail2ban-client status recidive
# You should see something like this as output
Status for the jail: recidive
|- Filter
|  |- Currently failed:	25
|  |- Total failed:	90
|  `- File list:	/var/log/fail2ban.log
`- Actions
   |- Currently banned:	10
   |- Total banned:	10
   `- Banned IP list:	129.226.114.97 103.246.240.26 142.93.60.53 167.172.163.162 109.255.185.65 150.158.178.137 66.70.130.149 180.166.184.66 64.225.35.135 218.255.86.106
```

Now we have Fail2Ban monitoring our SSH access and fully configured.

## What to do if I block myself

You should be very careful with your server access from now on. Make sure that you have access from your computer and I highly recommend [disabling password access](https://www.cyberciti.biz/faq/how-to-disable-ssh-password-login-on-linux/).

You can wait the default 10 minutes or you can access from a different IP address (like routing your mobile phone) and remove your IP address from the blocklist with the following command:

```shell
fail2ban-client set jailname unbanip [IP_ADDRESS_HERE]
# Here is how it could look like
# if you want to unban an IP address from the sshd jail
fail2ban-client set sshd unbanip 1.1.1.1
# from the recidive jail
fail2ban-client set recidive unbanip 1.1.1.1
```

## Where to go from here

Fail2Ban is quite extensive and supports many different kinds of extensions like your own custom jails. The good thing is that amazing people around the world like to share their experience as well, so if you want to setup Fail2Ban for a different service like nginx, [Digital Ocean has a great tutorial about it](https://www.digitalocean.com/community/tutorials/how-to-protect-an-nginx-server-with-fail2ban-on-ubuntu-14-04) with a step-by-step guide.

You can also read more about it on the [Fail2Ban official page](https://www.fail2ban.org/wiki/index.php/Main_Page)