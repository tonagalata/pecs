"use client";

import { useEffect, useRef } from "react";
import type { DriveStep } from "driver.js";

export function useTour(mode: string, parentTab?: string) {
  const childTourStartedRef = useRef(false);
  const parentTourStartedRef = useRef(false);

  // ── Child mode tour ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "child") return;
    if (childTourStartedRef.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pecs:first-visit") === "false") return;

    childTourStartedRef.current = true;

    const launch = async () => {
      await new Promise((r) => setTimeout(r, 800));

      const { driver } = await import("driver.js");
      const el = (id: string) => document.getElementById(id);

      const candidates: DriveStep[] = [
        {
          popover: {
            title: "👋 Welcome to the PECS Board!",
            description:
              "This app helps you communicate by tapping picture cards to build messages. Let's take a quick look around!",
          },
        },
        {
          element: "#tour-sentence-strip",
          popover: {
            title: "📝 Your Message Strip",
            description:
              "Cards you tap appear here. Tap any card in the strip to remove it from your message.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-preselected-badge",
          popover: {
            title: "⭐ Favourite Cards",
            description:
              "Parents can mark favourite cards. Tap here to show only those cards, great for a focused board! It says 'Preselected On' when active.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-sentence-badge",
          popover: {
            title: "💬 Auto Sentence",
            description:
              "Turn this on to hear the whole message read aloud each time you add a card. It says 'Auto Sentence On' when active, no need to tap Speak!",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#tour-starter-cards",
          popover: {
            title: "⚡ Action Words",
            description:
              'Tap these quick-start phrases to begin a message fast, like "I want" or "I need"!',
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-category-filter",
          popover: {
            title: "🗂️ Category Filter",
            description:
              "Tap a category circle to show only cards from that group, Food, Actions, People and more. Tap it again to see all cards.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-card-grid",
          popover: {
            title: "🖼️ Picture Cards",
            description:
              "Tap any card to add it to your message. The app will say the word out loud for you!",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-lock-btn",
          popover: {
            title: "🔒 Parent Setup",
            description:
              "Parents: hold this button for a moment to open Parent Setup, add picture cards, pick favourites, and adjust voice settings.",
            side: "top",
            align: "center",
          },
        },
      ];

      const steps = candidates.filter(
        (step) => !step.element || el((step.element as string).replace("#", "")) !== null
      );

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Let's go! 🎉",
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 16,
        onDestroyed: () => {
          localStorage.setItem("pecs:first-visit", "false");
        },
        steps,
      });

      driverObj.drive();
    };

    launch();
  }, [mode]);

  // ── Parent mode tour (triggered on dashboard, covers all tabs via nav) ───────
  useEffect(() => {
    if (mode !== "parent") return;
    if (parentTourStartedRef.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pecs:first-visit-parent") === "false") return;

    parentTourStartedRef.current = true;

    const launch = async () => {
      // Wait for parent mode to render
      await new Promise((r) => setTimeout(r, 500));

      const { driver } = await import("driver.js");
      const el = (id: string) => document.getElementById(id);

      const candidates: DriveStep[] = [
        {
          popover: {
            title: "👩‍👧 Welcome to Parent Setup!",
            description:
              "This is where you manage your child's PECS board, add cards, pick favourites, and configure the voice. Let's take a look!",
          },
        },
        {
          element: "#tour-parent-card-library",
          popover: {
            title: "📋 Card Library",
            description:
              "Tap any card to add it to your child's board as a favourite. Tap it again to remove it. The checkmark shows it's selected.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-parent-board-preview",
          popover: {
            title: "👀 Live Board Preview",
            description:
              "This shows exactly which cards will appear on your child's board. Tap a card here to deselect it.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-parent-save-btn",
          popover: {
            title: "✅ Save & Return",
            description:
              "When you're happy with the board, tap here to save everything and go back to your child's view.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-nav-preselected",
          popover: {
            title: "⭐ Preselected Tab",
            description:
              "Open this tab to see all your cards at once and quickly toggle which ones appear on the child's board.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-nav-library",
          popover: {
            title: "📚 Library Tab",
            description:
              "Create and manage custom cards here, earch the pictogram library, take a photo, or add Action Words that appear in the top row.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-nav-settings",
          popover: {
            title: "⚙️ Settings Tab",
            description:
              "Adjust text-to-speech, turn on Auto-Sentence mode, and control which card categories (like ABCs or Numbers) show on the board.",
            side: "top",
            align: "center",
          },
        },
      ];

      const steps = candidates.filter(
        (step) => !step.element || el((step.element as string).replace("#", "")) !== null
      );

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it! ✅",
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 16,
        onDestroyed: () => {
          localStorage.setItem("pecs:first-visit-parent", "false");
        },
        steps,
      });

      driverObj.drive();
    };

    launch();
  }, [mode, parentTab]);
}
