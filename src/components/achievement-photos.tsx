"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Upload,
} from "lucide-react";
import { photoCriteria } from "@/lib/photo-criteria";
import type { AppView, SessionView } from "@/lib/model";

function SavedPhoto({
  session,
  person,
}: {
  session: SessionView;
  person: SessionView["people"][number];
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.photo?.id]);
  if (!person.photo)
    return (
      <div className="achievement-photo-placeholder">
        <Camera size={25} strokeWidth={1.3} />
        <span>{person.name} hasn’t added a photo yet</span>
      </div>
    );
  return (
    <figure className="achievement-photo-figure">
      {failed ? (
        <div className="achievement-photo-placeholder">
          <span>This photo couldn’t load.</span>
          <button className="text-action" onClick={() => setFailed(false)}>
            Retry photo
          </button>
        </div>
      ) : (
        <img
          src={`/api/quests/${session.id}/photos/${person.id}?v=${person.photo.id}`}
          alt={`${person.name}’s achievement photo for ${session.quest.title}`}
          loading="lazy"
          onError={() => setFailed(true)}
          width={person.photo.width}
          height={person.photo.height}
        />
      )}
      <figcaption>
        <span>{person.name}</span>
        <span>
          <Check size={12} />{" "}
          {person.photo.validation?.status === "approved"
            ? person.photo.validation.provider === "demo"
              ? "Demo approval"
              : "Photo checked"
            : "Photo saved"}
        </span>
      </figcaption>
    </figure>
  );
}
export function AchievementGallery({ session }: { session: SessionView }) {
  if (!session.people.some((person) => person.photo)) return null;
  return (
    <div className="achievement-gallery">
      {session.people.map((person) => (
        <SavedPhoto key={person.id} session={session} person={person} />
      ))}
    </div>
  );
}
export function AchievementUpload({
  data,
  disabled,
  onUpdated,
  perform,
}: {
  data: AppView;
  disabled: boolean;
  onUpdated: (data: AppView) => void;
  perform: (command: Record<string, unknown>) => Promise<void>;
}) {
  const session = data.session!;
  const self = session.people.find((person) => person.id === data.user.id)!;
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [useMeta, setUseMeta] = useState(false);
  const validation = self.photo?.validation;
  const chooser = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function select(next?: File) {
    setError("");
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Choose a JPEG, PNG or WebP photo.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Choose a photo smaller than 10 MB.");
      return;
    }
    setFile(next);
  }
  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("photo", file);
      if (useMeta) form.append("validationMode", "meta");
      const response = await fetch(`/api/quests/${session.id}/photos`, {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Your photo wasn’t saved. Please try again.",
        );
      onUpdated(result);
      setFile(undefined);
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? "The upload was interrupted. Reconnect and try again; your selected photo is still here."
          : caught instanceof Error
            ? caught.message
            : "Your photo wasn’t saved. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="achievement-upload">
      <span className="section-kicker">
        <Camera size={13} /> YOUR ACHIEVEMENT PHOTO
      </span>
      <p>
        Each person uploads their own photo showing the requirements below.
        Faces are optional. Meta AI checks the visible evidence before you
        confirm.
      </p>
      <ul className="photo-criteria">
        {photoCriteria(session.quest).map((criterion) => (
          <li key={criterion}>{criterion}</li>
        ))}
      </ul>
      {validation && (
        <div className={`photo-validation ${validation.status}`} role="status">
          <strong>
            {validation.status === "approved"
              ? validation.provider === "demo"
                ? "Approved in demo simulation"
                : "Photo check passed"
              : validation.status === "rejected"
                ? "Try a clearer photo"
                : validation.status === "error"
                  ? "Photo saved · check unavailable"
                  : "Checking your photo…"}
          </strong>
          <p>{validation.reasoning}</p>
          {validation.criteria.length > 0 && (
            <ul>
              {validation.criteria.map((c) => (
                <li key={c.criterion}>
                  {c.met ? "✓" : "○"} {c.criterion}
                  <small>{c.evidence}</small>
                </li>
              ))}
            </ul>
          )}
          {!self.completed && validation.status !== "approved" && (
            <button
              className="text-action"
              disabled={
                disabled ||
                uploading ||
                (validation.status === "pending" &&
                  Date.now() - validation.checkedAt < 30_000)
              }
              onClick={() =>
                void perform({
                  action: "retryPhoto",
                  sessionId: session.id,
                  photoId: self.photo!.id,
                })
              }
            >
              Retry photo check
            </button>
          )}
        </div>
      )}
      {self.photo && (
        <SavedPhoto key={self.photo.id} session={session} person={self} />
      )}
      {!self.completed && (
        <>
          <input
            className="photo-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose achievement photo"
            ref={chooser}
            disabled={disabled || uploading}
            onChange={(event) => {
              select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            className="photo-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            aria-label="Take achievement photo"
            ref={camera}
            disabled={disabled || uploading}
            onChange={(event) => {
              select(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {preview && (
            <figure className="achievement-selected">
              <img
                src={preview}
                alt="Your selected achievement photo preview"
              />
              <figcaption>Preview — not uploaded yet</figcaption>
            </figure>
          )}
          <div className="achievement-upload-actions">
            <button
              className="app-button secondary"
              disabled={disabled || uploading}
              onClick={() => chooser.current?.click()}
            >
              <ImagePlus size={15} />
              {self.photo || file ? "Choose another photo" : "Choose photo"}
            </button>
            <button
              className="app-button secondary camera-button"
              disabled={disabled || uploading}
              onClick={() => camera.current?.click()}
            >
              <Camera size={15} /> Take photo
            </button>
          </div>
          {data.demo && file && (
            <label className="photo-ai-choice">
              <input
                type="checkbox"
                checked={useMeta}
                onChange={(event) => setUseMeta(event.target.checked)}
                disabled={uploading || disabled}
              />{" "}
              Use real Meta AI for this photo
            </label>
          )}
          {file && (
            <button
              className="app-button primary wide"
              disabled={disabled || uploading}
              onClick={() => void upload()}
            >
              {uploading ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <Upload size={15} />
              )}
              {uploading ? "Saving and checking…" : "Save my achievement photo"}
            </button>
          )}
          {data.demo && !file && !self.photo && (
            <button
              className="text-action"
              disabled={disabled || uploading}
              onClick={() =>
                void perform({
                  action: "demoPhoto",
                  sessionId: session.id,
                  participant: "self",
                })
              }
            >
              Use a sample image for this demo
            </button>
          )}
        </>
      )}
      {error && (
        <p className="photo-error" role="alert">
          {error}
        </p>
      )}
      <small>
        <LockKeyhole size={12} />
        {self.completed
          ? "Your photo is locked after your confirmation."
          : data.demo && validation?.provider !== "meta"
            ? "Visible only in this demo room. AI checking is simulated."
            : "Visible to your quest partner. Sent to Meta AI for checking."}
      </small>
      {data.demo && (
        <small>
          Demo approvals are simulated unless you select real Meta AI. Demo
          progress stays separate from real accounts.
        </small>
      )}
    </div>
  );
}
