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

    // Paper ID used for the downloaded filename
    const paperId = String(submission.paperId || id);

    // Support both possible Firestore field names
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

    // Firebase Storage paths are bucket-relative.
    const file = adminStorage
      .bucket()
      .file(storagePath);

    // Check whether the file exists
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

    // Download file and get metadata simultaneously
    const [downloadResult, metadataResult] =
      await Promise.all([
        file.download(),
        file.getMetadata(),
      ]);

    /*
     * Firebase Admin SDK returns:
     *
     * file.download() -> [Buffer]
     * file.getMetadata() -> [FileMetadata]
     *
     * Extract the actual values from those arrays.
     */
    const downloadedBuffer = downloadResult[0];
    const metadata = metadataResult[0];

    /*
     * Convert Node.js Buffer into Uint8Array.
     *
     * NextResponse expects a Web API compatible BodyInit.
     */
    const buffer = new Uint8Array(downloadedBuffer);

    // Determine MIME type
    const contentType =
      metadata.contentType ||
      getContentTypeFromPath(storagePath);

    // Determine file extension
    const extension = getExtension(
      String(metadata.name || storagePath),
      contentType
    );

    // Generate safe filename
    const filename =
      `${sanitizeFilename(paperId)}${extension}`;

    // Return manuscript as downloadable file
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
 * Determine file extension.
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
 * Determine MIME type from storage path
 * when Firebase metadata does not contain contentType.
 */
function getContentTypeFromPath(
  storagePath: string
): string {
  const lowerPath = storagePath.toLowerCase();

  if (lowerPath.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerPath.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

/**
 * Make the paper ID safe for use as a filename.
 */
function sanitizeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "");
}
