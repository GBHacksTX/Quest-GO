"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LocateFixed, MapPin } from "lucide-react";
import type { Preferences, User } from "@/lib/model";

export function ProfileForm({
  user,
  demo,
  busy,
  save,
}: {
  user: User;
  demo: boolean;
  busy: boolean;
  save: (name: string, preferences: Preferences) => Promise<void>;
}) {
  const [name, setName] = useState(
    user.displayName === "Explorer" ? "" : user.displayName,
  );
  const [preferences, setPreferences] = useState<Preferences>({
    ...user.preferences,
    area: user.preferences.area || (demo ? "Austin, TX" : ""),
  });
  const [locationNote, setLocationNote] = useState("");
  const update = (value: Partial<Preferences>) =>
    setPreferences((current) => ({ ...current, ...value }));
  function locate() {
    if (!navigator.geolocation) {
      setLocationNote(
        "Location isn't available in this browser. Enter your area below.",
      );
      return;
    }
    setLocationNote("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPreferences((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
          area: current.area || "Current location",
        }));
        setLocationNote(
          "Location added. Your coordinates are not shared with your quest partner.",
        );
      },
      () =>
        setLocationNote(
          "Couldn't access your location. You can enter your city or neighborhood instead.",
        ),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void save(name.trim(), preferences);
  }
  return (
    <form className="profile-form panel" onSubmit={submit}>
      <div className="panel-intro">
        <span className="section-kicker">A QUEST THAT FEELS LIKE YOU</span>
        <h2>
          {user.onboarded
            ? "Make it your kind of day."
            : "First, a little about you."}
        </h2>
        <p>A few small details help us find something you’ll both enjoy.</p>
      </div>
      <label className="field">
        What should we call you?
        <input
          name="displayName"
          autoComplete="nickname"
          placeholder="Your first name"
          minLength={2}
          maxLength={32}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <fieldset className="field">
        <legend>Your pace</legend>
        <div className="mode-options">
          {(["normal", "work"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-option ${preferences.mode === mode ? "selected" : ""}`}
              aria-pressed={preferences.mode === mode}
              onClick={() => update({ mode })}
            >
              <span>
                {mode === "normal"
                  ? "A little adventure"
                  : "A workday breather"}
              </span>
              <small>
                {mode === "normal"
                  ? "Explore, connect, try something new"
                  : "Short breaks and fresh perspectives"}
              </small>
              {preferences.mode === mode && <Check size={16} />}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field-grid">
        <label className="field">
          Time to spare
          <select
            value={preferences.minutes}
            onChange={(event) =>
              update({ minutes: Number(event.target.value) })
            }
          >
            {[15, 30, 60, 120].map((minutes) => (
              <option value={minutes} key={minutes}>
                {minutes < 60
                  ? `${minutes} minutes`
                  : `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Budget per person
          <select
            value={preferences.budget}
            onChange={(event) => update({ budget: Number(event.target.value) })}
          >
            {[0, 5, 10, 20, 50, 100].map((cost) => (
              <option value={cost} key={cost}>
                {cost === 0 ? "Keep it free" : `Up to $${cost}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="field">
        <legend>Things you’re drawn to</legend>
        <div className="interest-options">
          {["Explore", "Coffee", "Food", "Outdoors", "Creative", "Games"].map(
            (interest) => (
              <button
                type="button"
                key={interest}
                aria-pressed={preferences.interests.includes(interest)}
                className={
                  preferences.interests.includes(interest) ? "selected" : ""
                }
                onClick={() => {
                  const interests = preferences.interests.includes(interest)
                    ? preferences.interests.filter(
                        (entry) => entry !== interest,
                      )
                    : [...preferences.interests, interest];
                  if (interests.length) update({ interests });
                }}
              >
                {interest}
                {preferences.interests.includes(interest) && (
                  <Check size={12} />
                )}
              </button>
            ),
          )}
        </div>
      </fieldset>
      <label className="field">
        Your city or neighborhood
        <span className="input-icon">
          <MapPin size={17} />
          <input
            name="area"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. West Campus, Austin"
            value={preferences.area}
            onChange={(event) =>
              update({
                area: event.target.value,
                latitude: undefined,
                longitude: undefined,
              })
            }
          />
        </span>
      </label>
      <button className="text-action" type="button" onClick={locate}>
        <LocateFixed size={15} /> Use my current location
      </button>
      <p className="field-note" role="status">
        {locationNote ||
          "Used for nearby suggestions. Your precise location stays private."}
      </p>
      <button
        className="app-button primary wide"
        disabled={busy || name.trim().length < 2}
      >
        {busy
          ? "Saving…"
          : user.onboarded
            ? "Save preferences"
            : "Continue to device setup"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
