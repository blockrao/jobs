"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";

interface JobPost {
  id: string;
  title: string;
  exam_name: string;
  organization: string;
  vacancies: number | null;
  salary_min: string | null;
  salary_max: string | null;
}

interface EnrichmentData {
  salary: string;
  qualifications: string[];
  experience_years: number | null;
  age_limit: string;
  selection_process: string[];
  benefits: string[];
}

export default function EnrichPostsPage() {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData>({
    salary: "",
    qualifications: [],
    experience_years: null,
    age_limit: "",
    selection_process: [],
    benefits: [],
  });

  // Load posts on mount
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetch("/api/admin/posts-list");
        if (!response.ok) throw new Error("Failed to load posts");
        const data = await response.json();
        setPosts(data.posts);
        if (data.posts.length > 0) {
          setSelectedPostId(data.posts[0].id);
        }
      } catch (error) {
        setMessage({ type: "error", text: `Failed to load posts: ${error}` });
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  const handleArrayInput = (field: "qualifications" | "selection_process" | "benefits", value: string) => {
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setEnrichmentData((prev) => ({
      ...prev,
      [field]: lines,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPostId) {
      setMessage({ type: "error", text: "Please select a post" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: selectedPostId,
          enrichment: enrichmentData,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ type: "success", text: "Post enriched successfully!" });
        setEnrichmentData({
          salary: "",
          qualifications: [],
          experience_years: null,
          age_limit: "",
          selection_process: [],
          benefits: [],
        });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to enrich post" });
      }
    } catch (error) {
      setMessage({ type: "error", text: `Error: ${error}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-neutral-500">Loading posts...</p>
      </div>
    );
  }

  const selectedPost = posts.find((p) => p.id === selectedPostId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enrich Posts</h1>
        <Link href="/admin" className="text-sm underline">
          Back to Admin
        </Link>
      </div>

      {message && (
        <div
          role="alert"
          className={`rounded border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Select Post to Enrich</h2>
          <p className="mb-2 text-sm text-neutral-500">
            Found {posts.length} active posts. Sorted by vacancy count (largest first).
          </p>
          <select
            value={selectedPostId}
            onChange={(e) => setSelectedPostId(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          >
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title} ({post.exam_name}) - {post.vacancies || 0} vacancies
              </option>
            ))}
          </select>
        </div>

        {selectedPost && (
          <div className="rounded bg-neutral-50 p-4">
            <h3 className="font-semibold">{selectedPost.title}</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div>
                <dt className="font-medium text-neutral-600">Exam:</dt>
                <dd className="text-neutral-900">{selectedPost.exam_name}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-600">Organization:</dt>
                <dd className="text-neutral-900">{selectedPost.organization}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-600">Vacancies:</dt>
                <dd className="text-neutral-900">{selectedPost.vacancies || "Not specified"}</dd>
              </div>
              {selectedPost.salary_min && (
                <div>
                  <dt className="font-medium text-neutral-600">Salary Range:</dt>
                  <dd className="text-neutral-900">
                    ₹{selectedPost.salary_min} - ₹{selectedPost.salary_max}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded border border-neutral-300 p-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Monthly Salary / Pay Scale
            </label>
            <input
              type="text"
              placeholder="e.g., ₹35,000-₹60,000/month"
              value={enrichmentData.salary}
              onChange={(e) =>
                setEnrichmentData((prev) => ({
                  ...prev,
                  salary: e.target.value,
                }))
              }
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">Optional. Format: ₹min-₹max or pay level info</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Qualifications</label>
            <textarea
              placeholder="Enter one qualification per line&#10;e.g.:&#10;Graduation&#10;B.Tech in IT&#10;Experience: 2+ years"
              value={enrichmentData.qualifications.join("\n")}
              onChange={(e) => handleArrayInput("qualifications", e.target.value)}
              className="mt-1 h-24 w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-neutral-500">One qualification per line</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Years of Experience</label>
            <input
              type="number"
              placeholder="e.g., 2"
              value={enrichmentData.experience_years ?? ""}
              onChange={(e) =>
                setEnrichmentData((prev) => ({
                  ...prev,
                  experience_years: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">Optional. Number of years required</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Age Limit</label>
            <input
              type="text"
              placeholder="e.g., 18-30 years"
              value={enrichmentData.age_limit}
              onChange={(e) =>
                setEnrichmentData((prev) => ({
                  ...prev,
                  age_limit: e.target.value,
                }))
              }
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">Optional. Age range or limit</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Selection Process</label>
            <textarea
              placeholder="Enter one step per line&#10;e.g.:&#10;Written Exam&#10;Interview&#10;Medical Test"
              value={enrichmentData.selection_process.join("\n")}
              onChange={(e) => handleArrayInput("selection_process", e.target.value)}
              className="mt-1 h-24 w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-neutral-500">One step per line</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Benefits / Allowances</label>
            <textarea
              placeholder="Enter one benefit per line&#10;e.g.:&#10;Pension&#10;Medical Insurance&#10;Leave benefits&#10;Travel allowance"
              value={enrichmentData.benefits.join("\n")}
              onChange={(e) => handleArrayInput("benefits", e.target.value)}
              className="mt-1 h-24 w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-neutral-500">One benefit per line</p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <SubmitButton
              disabled={!selectedPostId || submitting}
              pendingText={submitting ? "Saving..." : undefined}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-neutral-300"
            >
              Save Enrichment
            </SubmitButton>
            <button
              type="button"
              onClick={() =>
                setEnrichmentData({
                  salary: "",
                  qualifications: [],
                  experience_years: null,
                  age_limit: "",
                  selection_process: [],
                  benefits: [],
                })
              }
              className="text-sm underline text-neutral-600"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
