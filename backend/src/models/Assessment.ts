import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAssessment extends Document {
  creator_id: Types.ObjectId;
  title: string;
  description?: string;
  duration_minutes: number;
  total_marks?: number;
  pass_percentage: number;
  is_active: boolean;
  code?: string;
  created_at: Date;
}

const assessmentSchema = new Schema<IAssessment>(
  {
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    duration_minutes: {
      type: Number,
      required: true,
    },
    total_marks: Number,
    pass_percentage: {
      type: Number,
      default: 40,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: { createdAt: "created_at" } }
);

assessmentSchema.index({ creator_id: 1 });
assessmentSchema.index({ is_active: 1 });

export default mongoose.model<IAssessment>("Assessment", assessmentSchema);
