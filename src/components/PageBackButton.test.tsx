import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PageBackButton } from "@/components/PageBackButton";

const Page = ({ name }: { name: string }) => <p>{name}</p>;

describe("page back arrow", () => {
  it("returns to the page the user came from", () => {
    render(
      <MemoryRouter initialEntries={["/superadmin", "/admin/users"]} initialIndex={1}>
        <Routes>
          <Route path="/superadmin" element={<Page name="console" />} />
          <Route path="/admin/users" element={<PageBackButton to="/dashboard" label="Back" />} />
          <Route path="/dashboard" element={<Page name="dashboard" />} />
        </Routes>
      </MemoryRouter>,
    );
    // MemoryRouter does not write window.history, so emulate an earlier in-app page.
    window.history.replaceState({ idx: 1 }, "");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("console")).toBeTruthy();
  });

  it("goes to the fallback page when opened directly from a link", () => {
    window.history.replaceState({ idx: 0 }, "");
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route path="/admin/users" element={<PageBackButton to="/superadmin" label="Back" />} />
          <Route path="/superadmin" element={<Page name="console" />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("console")).toBeTruthy();
  });

  it("is a 44px touch target", () => {
    render(<MemoryRouter><PageBackButton label="Back" /></MemoryRouter>);
    const btn = screen.getByRole("button", { name: "Back" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });
});
