import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AIChatWidget from "@/components/ai/AIChatWidget";

describe("AI assistant trigger", () => {
  it("uses the card holder's first name and opens the assistant", () => {
    render(<AIChatWidget cardId="card-1" cardOwnerName="  Sofia   Requejo " />);

    const trigger = screen.getByRole("button", { name: "Ask Sofia — open AI assistant" });
    expect(trigger.querySelector(".lucide-bot")).not.toBeNull();
    expect(trigger.querySelector(".lucide-sparkles")).not.toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByText("Sofia's Assistant")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ask Sofia — open AI assistant" })).toBeNull();
  });

  it("falls back to Ask AI when the card holder has no name", () => {
    render(<AIChatWidget cardId="card-2" cardOwnerName="   " />);

    expect(screen.getByRole("button", { name: "Ask AI — open AI assistant" })).toBeTruthy();
  });
});
