
FROM ruby:3.4.4-slim
LABEL author="Bruno Paulino"
LABEL version="1.0.0"

ENV BUNDLER_VERSION 2.0.2
RUN apt-get update && \
    apt-get install --no-install-recommends -y \
        bats \
        build-essential \
        ca-certificates \
        curl \
        make \
        shellcheck \
        git-all \
    && gem install bundler:2.0.2 \
    && bundle config --global silence_root_warning 1

COPY entrypoint.sh /

ENTRYPOINT ["sh", "/entrypoint.sh"]