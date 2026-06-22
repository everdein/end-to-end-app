# 0001 Use React and Spring Boot for the Reference App

## Status

Accepted

## Context

This repository is a learning and reference application. It should demonstrate
modern frontend/backend communication, practical development tooling, testable
application boundaries, and patterns that can scale into a production-grade
system over time.

The app needs a frontend that supports a rich user experience and a backend
that can expose REST APIs, perform validation, and eventually support
persistence, authentication, integrations, and scheduled work.

## Decision

Use React, TypeScript, Vite, Redux Toolkit, and Vitest for the frontend.

Use Spring Boot, Java, Maven, and Spring MVC for the backend.

Keep the frontend and backend in the same repository so the project can serve
as an end-to-end reference app with shared CI, documentation, and local
development workflows.

## Consequences

- The project demonstrates a common full-stack architecture used in production
  systems.
- The frontend can evolve toward routing, richer UI composition, and more
  advanced client state patterns.
- The backend can evolve toward database persistence, authentication,
  authorization, external integrations, and background jobs.
- The repo has two build systems, so documentation and CI need to keep the
  frontend and backend workflows clear.
- The current design is intentionally more structured than a small prototype,
  but that structure makes the app more useful as a reference project.
