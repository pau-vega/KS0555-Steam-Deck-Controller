# Dockerfile — build .deb + .flatpak from source (mirrors CI)
# Usage: docker build -t robot-controller-builder -f flatpak/Dockerfile . && docker run --rm -v $(pwd):/repo robot-controller-builder
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
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
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$PNPM_HOME" SHELL="$(which bash)" bash -

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g corepack@latest \
    && corepack enable

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH=/root/.cargo/bin:$PATH
RUN cargo install tauri-cli --version "^2"

RUN flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo \
    && flatpak install --user -y --noninteractive flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08

COPY . /workspace
WORKDIR /workspace

RUN pnpm install --frozen-lockfile

RUN pnpm build

WORKDIR /workspace/apps/frontend/src-tauri
RUN cargo tauri build --bundles deb

RUN cp /workspace/apps/frontend/src-tauri/target/release/bundle/deb/*.deb /workspace/flatpak/robot-controller.deb

WORKDIR /workspace

RUN flatpak-builder --user --install --force-clean --disable-rofiles-fuse build-dir flatpak/com.ks0555.robotcontroller.yaml \
    && mkdir -p repo \
    && flatpak build-export repo build-dir \
    && flatpak build-bundle repo RobotController-x86_64.flatpak com.ks0555.robotcontroller \
    && cp RobotController-x86_64.flatpak /repo/ \
    && echo "✓ Flatpak bundle copied to /repo/RobotController-x86_64.flatpak"
