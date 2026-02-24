import mongoose, { Schema, Document, Types } from "mongoose";

export interface IViolation extends Document {
  attempt_id: Types.ObjectId;
  violation_type: string;
  timestamp: Date;
  evidence_url?: string;
}

const violationSchema = new Schema<IViolation>(
  {
    attempt_id: {
      type: Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
    },
    violation_type: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
    evidence_url: String,
  }
);

violationSchema.index({ attempt_id: 1 });

export default mongoose.model<IViolation>("Violation", violationSchema);
