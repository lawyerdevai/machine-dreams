import { deleteEvalBatchArtworks } from "@/lib/redis";

export async function DELETE() {
  const deleted = await deleteEvalBatchArtworks();
  return Response.json({ deleted });
}
