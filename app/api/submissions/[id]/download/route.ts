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
        { success: false, message: "Submission ID is required." },
        { status: 400 }
      );
    }

    const snapshot = await adminFirestore
      .collection("submissions")
      .doc(id)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Submission not found." },
        { status: 404 }
      );
    }

    const submission = snapshot.data() || {};
    const paperId = String(submission.paperId || id);
    const storagePath = String(
      submission.manuscriptPath || submission.storagePath || ""
    );

    if (!storagePath) {
      return NextResponse.json(
        { success: false, message: "No manuscript file is associated with this submission." },
        { status: 404 }
      );
    }

    // Storage paths are bucket-relative. The bucket ID/name is NOT repeated here.
    const file = adminStorage.bucket().file(storagePath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Manuscript file was not found in Firebase Storage." },
        { status: 404 }
      );
    }

    const [downloaded, metadata] = await Promise.all([
      file.download(),
      file.getMetadata(),
    ]);

    const buffer = downloaded[0];
    const contentType = metadata.contentType || "application/octet-stream";
    const extension = getExtension(String(metadata.name || storagePath), contentType);
    const filename = `${sanitizeFilename(paperId)}${extension}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("MANUSCRIPT DOWNLOAD ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to download manuscript." },
      { status: 500 }
    );
  }
}

function getExtension(filename: string, contentType: string) {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot !== -1) {
    const extension = filename.substring(lastDot).toLowerCase();
    if (extension === ".pdf" || extension === ".docx") {
      return extension;
    }
  }

  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return ".docx";
  }

  return ".pdf";
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
