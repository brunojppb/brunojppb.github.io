---
layout: default
title: Open Source
keywords: open-source,projects,rust,typescript,react,pdf,cache,markdown
meta_description:
  A collection of Bruno's open-source projects including Turbo Cache Server,
  Sanitisium, and markitdown-ui.
meta_image: /assets/images/bpaulino.jpg
---

<div style="text-align: center">
    <h1>Open Source Projects</h1>
    <p style="max-width: 600px; margin: 0 auto; line-height: 1.6;">
        Here are some of the open-source projects I've been working on. 
        I love building tools that solve real-world problems and sharing them with the community.
    </p>
</div>

<div style="line-height: 1.6;">
    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px; margin-top: 12px;">
        <h2 style="margin: 0 0 10px 0;"><a href="https://turbo.bpaulino.com/">Turbo Cache Server</a></h2>
        <div style="color: #888; margin-bottom: 20px; font-size: 14px;">Rust • Docker • GitHub Actions</div>
        <p>
            A blazingly fast Turborepo remote cache server written in Rust. This self-hosted solution accelerates monorepo build processes by caching and reusing build artifacts, dramatically reducing build times in CI/CD pipelines.
            <br/><br/>
            The server is compatible with S3-compatible storage services like AWS S3, Cloudflare R2, and Minio, making it flexible for different deployment scenarios. It can be deployed as a GitHub Action or Docker container, supporting various CI environments including GitHub and GitLab.
        </p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px;  margin-top: 12px; padding: 12px;">
        <h2 style="margin: 0 0 10px 0;"><a href="https://github.com/brunojppb/sanitisium">Sanitisium</a></h2>
        <div style="color: #888; margin-bottom: 20px; font-size: 14px;">Rust • PDFium • Security</div>
        <p>
            A secure PDF sanitization service written in Rust that eliminates threats by completely regenerating documents. Instead of trying to parse and remove threats, Sanitisium takes a unique approach: it converts PDF pages into 300 DPI bitmaps and creates entirely new PDFs from those images.
            <br/><br/>
            This method removes all potential security threats including malicious JavaScript, exploit payloads, phishing links, and buffer overflow risks. The project includes a CLI tool, core library, and HTTP API with background job processing, all built with process isolation for maximum security and performance.
        </p>
    </div>

</div>

<div style="text-align: center; margin-bottom: 12px">
    <p>
        All projects are open-source and available on my 
        <a href="https://github.com/brunojppb">GitHub profile</a>. 
        Feel free to contribute, report issues, or use them in your own projects!
    </p>
</div>
