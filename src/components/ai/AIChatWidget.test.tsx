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

  it("keeps the pill compact on phones and full size from the laptop breakpoint up", () => {
    render(<AIChatWidget cardId="card-6" cardOwnerName="Gerle Joy Mananans" />);

    const trigger = screen.getByRole("button", { name: "Ask Gerle — open AI assistant" });
    expect(trigger.className).toMatch(/(^|\s)min-h-11(\s|$)/);
    expect(trigger.className).toMatch(/(^|\s)px-3\.5(\s|$)/);
    expect(trigger.className).toMatch(/(^|\s)gap-1\.5(\s|$)/);
    expect(trigger.className).toMatch(/sm:min-h-14/);
    expect(trigger.className).toMatch(/sm:px-5/);
    expect(trigger.className).toMatch(/sm:gap-2\.5/);
    expect(trigger.className).not.toMatch(/(^|\s)min-h-14(\s|$)/);

    const label = trigger.querySelector("[data-chat-trigger-label]") as HTMLElement;
    expect(label.className).toMatch(/(^|\s)text-xs(\s|$)/);
    expect(label.className).toMatch(/sm:text-sm/);

    const icon = trigger.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(icon.className).toMatch(/(^|\s)h-5(\s|$)/);
    expect(icon.className).toMatch(/(^|\s)w-5(\s|$)/);
    expect(icon.className).toMatch(/sm:h-7/);
    expect(icon.className).toMatch(/sm:w-7/);
  });

  it("sits further from the phone screen edge and keeps the laptop offset", () => {
    render(<AIChatWidget cardId="card-7" cardOwnerName="Gerle Joy Mananans" />);

    const trigger = screen.getByRole("button", { name: "Ask Gerle — open AI assistant" });
    expect(trigger.className).toMatch(/(^|\s)right-6(\s|$)/);
    expect(trigger.className).toMatch(/sm:right-\[max\(1rem,calc\(\(100vw-42rem\)\/2\+1rem\)\)\]/);
    expect(trigger.className).not.toMatch(/(^|\s)right-\[max/);
  });

  it("sits slightly higher on phones without moving the laptop position", () => {
    render(<AIChatWidget cardId="card-8" cardOwnerName="Gerle Joy Mananans" />);

    const trigger = screen.getByRole("button", { name: "Ask Gerle — open AI assistant" });
    expect(trigger.className).toMatch(/(^|\s)bottom-28(\s|$)/);
    expect(trigger.className).toMatch(/sm:bottom-24/);
    expect(trigger.className).not.toMatch(/(^|\s)bottom-24(\s|$)/);
  });

  it("outlines the open chat window in gold so it separates from the page", () => {
    render(<AIChatWidget cardId="card-5" cardOwnerName="Gerle Joy Mananans" />);

    fireEvent.click(screen.getByRole("button", { name: "Ask Gerle — open AI assistant" }));

    const panel = document.querySelector("[data-chat-panel]") as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.className).toMatch(/border-gold/);
    expect(panel.className).not.toMatch(/border-border/);
    expect(panel.className).toMatch(/shadow-gold/);
  });

  it("wraps the pill in a soft gold glow without changing its size or position", () => {
    render(<AIChatWidget cardId="card-9" cardOwnerName="Gerle Joy Mananans" />);

    const trigger = screen.getByRole("button", { name: "Ask Gerle — open AI assistant" });
    expect(trigger.className).toMatch(/(^|\s)ask-pill-glow(\s|$)/);

    // Size and placement classes are exactly the ones the earlier tests pin.
    expect(trigger.className).toMatch(/(^|\s)min-h-11(\s|$)/);
    expect(trigger.className).toMatch(/(^|\s)px-3\.5(\s|$)/);
    expect(trigger.className).toMatch(/(^|\s)bottom-28(\s|$)/);
    expect(trigger.className).toMatch(/(^|\s)right-6(\s|$)/);
    expect(trigger.className).toMatch(/sm:min-h-14/);
    expect(trigger.className).toMatch(/sm:bottom-24/);
    expect(trigger.className).toMatch(/sm:right-\[max\(1rem,calc\(\(100vw-42rem\)\/2\+1rem\)\)\]/);
  });

  it("prints the assistant name in the chat header large enough to read on a phone", () => {
    render(<AIChatWidget cardId="card-10" cardOwnerName="Gerle Joy Mananans" />);

    fireEvent.click(screen.getByRole("button", { name: "Ask Gerle — open AI assistant" }));

    const headerName = document.querySelector("[data-chat-header-name]") as HTMLElement;
    expect(headerName).not.toBeNull();
    expect(headerName.textContent?.trim()).toBe("Gerle's Assistant");
    expect(headerName.className).toMatch(/(^|\s)text-base(\s|$)/);
    expect(headerName.className).not.toMatch(/(^|\s)text-sm(\s|$)/);
  });
});
