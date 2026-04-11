import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

describe("Accessibility (axe-core)", () => {
  it("ErrorBoundary fallback has no a11y violations", async () => {
    const { ErrorBoundary } = await import("@/components/shared/ErrorBoundary");

    function ThrowError(): never {
      throw new Error("test error");
    }

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
    spy.mockRestore();
  });

  it("BrandedLoader has no a11y violations", async () => {
    const { BrandedLoader } = await import("@/components/shared/BrandedLoader");
    const { container } = render(<BrandedLoader text="Carregando..." />);
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("basic form structure has proper labels", async () => {
    // Simulate a basic form pattern used across the app
    const { container } = render(
      <form>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" aria-required="true" />
        </div>
        <div>
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" aria-required="true" />
        </div>
        <button type="submit">Entrar</button>
      </form>,
    );

    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("detects form without labels as violation", async () => {
    const { container } = render(
      <form>
        <input type="email" />
        <input type="password" />
        <button type="submit">Entrar</button>
      </form>,
    );

    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    // This SHOULD have violations (missing labels)
    expect(results.violations.length).toBeGreaterThan(0);
  });

  it("skip-link pattern follows WCAG standards", async () => {
    const { container } = render(
      <div>
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Pular para o conteúdo
        </a>
        <nav aria-label="Menu principal">
          <a href="/admin">Dashboard</a>
          <a href="/admin/clientes">Clientes</a>
        </nav>
        <main id="main-content">
          <h1>Página</h1>
          <p>Conteúdo</p>
        </main>
      </div>,
    );

    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
