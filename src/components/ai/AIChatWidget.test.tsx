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

  it("uses the owner's custom chat name and shows every character without cutting it off", () => {
    const longName = "Coach Maria Sofia Dela Cruz PH";
    render(<AIChatWidget cardId="card-3" cardOwnerName="Ma Sofia Requejo" chatbotName={longName} />);

    const trigger = screen.getByRole("button", { name: `Ask ${longName} — open AI assistant` });
    const label = trigger.querySelector("[data-chat-trigger-label]") as HTMLElement;
    expect(label.textContent?.trim()).toBe(`Ask ${longName}`);
    expect(label.className).not.toMatch(/truncate|max-w-40/);
    expect(trigger.className).not.toMatch(/(^|\s)h-14(\s|$)/);

    fireEvent.click(trigger);
    expect(screen.getByText(`${longName}'s Assistant`)).toBeTruthy();
  });

  it("falls back to the first name when the custom chat name is blank", () => {
    render(<AIChatWidget cardId="card-4" cardOwnerName="Ma Sofia Requejo" chatbotName="   " />);
    expect(screen.getByRole("button", { name: "Ask Ma — open AI assistant" })).toBeTruthy();
  });
});
