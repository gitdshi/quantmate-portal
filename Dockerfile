# syntax=docker/dockerfile:1.7

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app

ARG IMAGE_BUILD_TIME=unknown

# Install deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
		npm ci --silent --prefer-offline --no-audit

# Persist portal package version for runtime display in container
RUN mkdir -p /opt/quantmate-build \
		&& node -e "const fs=require('fs');const p=require('./package.json');fs.writeFileSync('/opt/quantmate-build/portal_version', p.version || '0.0.0')" \
		&& if [ "$IMAGE_BUILD_TIME" = "unknown" ]; then \
				date -u +"%Y-%m-%dT%H:%M:%SZ" > /opt/quantmate-build/build_time; \
			else \
				echo "$IMAGE_BUILD_TIME" > /opt/quantmate-build/build_time; \
			fi

# Build
COPY . ./
RUN npm run build

FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /opt/quantmate-build /opt/quantmate-build
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
