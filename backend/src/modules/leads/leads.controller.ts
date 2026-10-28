import { Request, Response, NextFunction } from "express";
import {
  createLeadSchema,
  listLeadsQuerySchema,
  leadIdParamSchema,
  updateLeadStatusSchema,
  createLeadNoteSchema,
} from "./leads.schema.js";
import * as leadsServiceModule from "./leads.service.js";

export class LeadsController {
  constructor(private service: typeof leadsServiceModule = leadsServiceModule) {}

  /**
   * Public endpoint: Submits a new homeowner quote inquiry.
   */
  handleCreateLead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = createLeadSchema.parse(req.body);
      const result = await this.service.createLead(validatedData);

      res.status(201).json({
        success: true,
        data: {
          leadId: result.leadId,
          status: result.status,
          submissionDate: result.submissionDate,
        },
        message: "Thank you! Your quote request has been received. Our team will contact you shortly.",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Authenticated endpoint: Lists leads with pagination, status filtering, and search.
   */
  handleGetLeads = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = listLeadsQuerySchema.parse(req.query);
      const result = await this.service.listLeads(query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Authenticated endpoint: Retrieves full lead profile by ID with chronological notes.
   */
  handleGetLeadById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);
      const lead = await this.service.getLeadById(id);

      if (!lead) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Lead not found.",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Authenticated endpoint: Updates a lead's lifecycle status.
   */
  handleUpdateLeadStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);
      const { status } = updateLeadStatusSchema.parse(req.body);

      const updatedLead = await this.service.updateLeadStatus(id, status);

      if (!updatedLead) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Lead not found.",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedLead,
        message: `Lead status updated to '${status}'.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Authenticated endpoint: Adds a timestamped follow-up note to a lead.
   */
  handleAddLeadNote = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);
      const { noteText } = createLeadNoteSchema.parse(req.body);
      const authorId = req.user?.id ?? null;

      const createdNote = await this.service.addLeadNote(id, authorId, noteText);

      if (!createdNote) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Lead not found.",
          },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: createdNote,
        message: "Follow-up note added successfully.",
      });
    } catch (error) {
      next(error);
    }
  };
}

export const leadsController = new LeadsController();

export const handleCreateLead = leadsController.handleCreateLead;
export const handleGetLeads = leadsController.handleGetLeads;
export const handleGetLeadById = leadsController.handleGetLeadById;
export const handleUpdateLeadStatus = leadsController.handleUpdateLeadStatus;
export const handleAddLeadNote = leadsController.handleAddLeadNote;
