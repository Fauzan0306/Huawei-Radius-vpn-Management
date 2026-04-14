FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    freeradius \
    freeradius-mysql \
    freeradius-utils \
    gettext-base \
    mariadb-client \
    perl \
  && rm -rf /var/lib/apt/lists/*

COPY docker/freeradius/sql.template /tmp/sql.template
COPY docker/freeradius/clients.template /tmp/clients.template
COPY docker/freeradius/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 1812/udp 1813/udp

ENTRYPOINT ["/entrypoint.sh"]
CMD ["freeradius", "-f", "-l", "stdout"]
