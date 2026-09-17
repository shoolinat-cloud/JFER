import { NextResponse } from "next/server";
import { adminFirestore, adminStorage } from "@/lib/FirebaseAdmin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission ID is required.",
        },
        { status: 400 }
      );
    }

    // Get submission from Firestore
    const snapshot = await adminFirestore
      .collection("submissions")
      .doc(id)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission not found.",
        },
        { status: 404 }
      );
    }

    const submission = snapshot.data() || {};

    // Paper ID
    const paperId = String(
      submission.paperId || id
    );

    // Firebase Storage path
    const storagePath = String(
      submission.manuscriptPath ||
        submission.storagePath ||
        ""
    );

    if (!storagePath) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No manuscript file is associated with this submission.",
        },
        { status: 404 }
      );
    }

    // Get file from Firebase Storage
    const file = adminStorage
      .bucket()
      .file(storagePath);

    // Check whether file exists
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Manuscript file was not found in Firebase Storage.",
        },
        { status: 404 }
      );
    }

    // Download file and get metadata
    const [downloadResult, metadataResult] =
      await Promise.all([
        file.download(),
        file.getMetadata(),
      ]);

    // Firebase returns the downloaded file as a Buffer
    const downloadedBuffer = downloadResult[0];

    // Firebase getMetadata() returns a metadata response
    const metadata = metadataResult[0];

    /*
     * Convert Node.js Buffer to Uint8Array.
     * NextResponse accepts Uint8Array as a valid BodyInit.
     */
    const buffer = new Uint8Array(downloadedBuffer);

    // Get content type
    const contentType =
      metadata.contentType ||
      getContentType(storagePath);

    // Get extension
    const extension = getExtension(
      String(metadata.name || storagePath),
      contentType
    );

    // Create safe download filename
    const filename =
      `${sanitizeFilename(paperId)}${extension}`;

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Content-Length":
          String(buffer.byteLength),

        "Cache-Control":
          "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error(
      "MANUSCRIPT DOWNLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to download manuscript.",
      },
      { status: 500 }
    );
  }
}

/**
 * Get the file extension.
 */
function getExtension(
  filename: string,
  contentType: string
): string {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot !== -1) {
    const extension = filename
      .substring(lastDot)
      .toLowerCase();

    if (
      extension === ".pdf" ||
      extension === ".docx"
    ) {
      return extension;
    }
  }

  if (contentType === "application/pdf") {
    return ".pdf";
  }

  if (
    contentType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ".docx";
  }

  return ".pdf";
}

/**
 * Get MIME type from the storage path
 * when Firebase metadata doesn't contain one.
 */
function getContentType(
  storagePath: string
): string {
  const path = storagePath.toLowerCase();

  if (path.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (path.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

/**
 * Sanitize the filename so it is safe to download.
 */
function sanitizeFilename(
  value: string
): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || "manuscript";
}
