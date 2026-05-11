# Dockerfile — build .deb + .flatpak from source
# Usage: just docker-build-all
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    jq \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libudev-dev \
    patchelf \
    flatpak \
    flatpak-builder \
    build-essential \
    pkg-config \
    libssl-dev \
    dbus-daemon \
    dbus-user-session \
    git \
    elfutils \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$PNPM_HOME" SHELL="$(which bash)" bash -

RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g corepack@latest \
    && corepack enable

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH=/root/.cargo/bin:$PATH
RUN cargo install tauri-cli --version "^2"

COPY . /workspace
WORKDIR /workspace

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm build

WORKDIR /workspace/apps/frontend/src-tauri
RUN cargo tauri build --bundles deb

RUN cp /workspace/apps/frontend/src-tauri/target/release/bundle/deb/*.deb /workspace/flatpak/robot-controller.deb

WORKDIR /workspace

RUN dbus-run-session -- bash -c ' \
    flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo && \
    flatpak install --system -y --noninteractive flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08 \
    '

CMD ["/bin/bash", "-c", "dbus-run-session -- bash -c 'flatpak-builder --system --force-clean --disable-rofiles-fuse build-dir flatpak/com.ks0555.robotcontroller.yaml && mkdir -p repo && flatpak build-export repo build-dir && flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller && cp RobotController-x86_64.flatpak /repo/ && echo \"✓ Flatpak bundle created: /repo/RobotController-x86_64.flatpak\"'"]
