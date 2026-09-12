import { NextResponse } from "next/server";
import { adminFirestore, adminStorage } from "@/lib/FirebaseAdmin";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const title = formData.get("title")?.toString().trim();
    const author = formData.get("author")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const affiliation = formData.get("affiliation")?.toString().trim();
    const country = formData.get("country")?.toString().trim();
    const category = formData.get("category")?.toString().trim();
    const keywords = formData.get("keywords")?.toString().trim();
    const abstract = formData.get("abstract")?.toString().trim();
    const manuscript = formData.get("manuscript");

    if (
      !title ||
      !author ||
      !email ||
      !affiliation ||
      !country ||
      !category ||
      !keywords ||
      !abstract
    ) {
      return NextResponse.json(
        { success: false, message: "Please complete all required fields." },
        { status: 400 }
      );
    }

    if (!(manuscript instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please upload a manuscript file." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(manuscript.type)) {
      return NextResponse.json(
        { success: false, message: "Only PDF and DOCX files are allowed." },
        { status: 400 }
      );
    }

    if (manuscript.size <= 0 || manuscript.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Manuscript file must be between 1 byte and 20 MB." },
        { status: 400 }
      );
    }

    const paperId = `JFER-${Date.now()}`;
    const submittedAt = new Date();
    const submissionRef = adminFirestore.collection("submissions").doc();

    const originalName = sanitizePathPart(manuscript.name || "manuscript");
    const extension = getExtension(originalName, manuscript.type);

    // Firebase Console displays the bucket name before this object path.
    // The Admin SDK path itself starts at the bucket root.
    const manuscriptPath = `manuscripts/${paperId}/${originalName}`;

    const buffer = Buffer.from(await manuscript.arrayBuffer());
    const bucket = adminStorage.bucket();
    const file = bucket.file(manuscriptPath);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: manuscript.type,
        metadata: {
          paperId,
          originalFileName: manuscript.name,
        },
      },
    });

    try {
      await submissionRef.set({
        paperId,
        title,
        author,
        email,
        affiliation,
        country,
        category,
        keywords,
        abstract,
        manuscriptPath,
        manuscriptFileName: manuscript.name,
        manuscriptFileType: manuscript.type,
        manuscriptFileSize: manuscript.size,
        pdfUrl: "",
        manuscriptUrl: "",
        fileUrl: "",
        status: "pending",
        submittedAt,
        updatedAt: submittedAt,
      });
    } catch (firestoreError) {
      // Do not leave an orphaned Storage object if Firestore fails.
      await file.delete().catch(() => undefined);
      throw firestoreError;
    }

    return NextResponse.json({
      success: true,
      paperId,
      submissionId: submissionRef.id,
      manuscriptPath,
      fileName: `${paperId}${extension}`,
    });
  } catch (error) {
    console.error("SUBMISSION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error while submitting manuscript.",
      },
      { status: 500 }
    );
  }
}

function sanitizePathPart(value: string) {
  const cleaned = value
    .replace(/\\/g, "/")
    .split("/")
    .pop() || "manuscript";

  return cleaned.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtension(filename: string, contentType: string) {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot !== -1) {
    const extension = filename.substring(lastDot).toLowerCase();
    if (extension === ".pdf" || extension === ".docx") {
      return extension;
    }
  }

  return contentType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ? ".docx"
    : ".pdf";
}
