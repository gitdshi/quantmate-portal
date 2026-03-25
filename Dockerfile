FROM node:20-alpine AS builder
WORKDIR /app

ARG IMAGE_BUILD_TIME=unknown

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Persist portal package version for runtime display in container
RUN node -e "const fs=require('fs');const p=require('./package.json');fs.writeFileSync('/tmp/portal_version', p.version || '0.0.0')"

# Build
COPY . ./
RUN npm run build

FROM nginx:stable-alpine
ARG IMAGE_BUILD_TIME=unknown

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /tmp/portal_version /opt/quantmate-build/portal_version
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN mkdir -p /opt/quantmate-build \
		&& if [ "$IMAGE_BUILD_TIME" = "unknown" ]; then \
			date -u +"%Y-%m-%dT%H:%M:%SZ" > /opt/quantmate-build/build_time; \
		else \
			echo "$IMAGE_BUILD_TIME" > /opt/quantmate-build/build_time; \
		fi \
		&& chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
