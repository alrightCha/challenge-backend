import { Injectable, Logger } from "@nestjs/common";

export enum JobType {
  CREATE_BEAR = "CREATE_BEAR",
  UPDATE_BEAR_NAME = "UPDATE_BEAR_NAME",
  UPDATE_BEAR_SIZE = "UPDATE_BEAR_SIZE",
  UPDATE_BEAR_COLORS = "UPDATE_BEAR_COLORS",
  DELETE_BEAR = "DELETE_BEAR",
  ADD_COLOR = "ADD_COLOR",
  DELETE_COLOR = "DELETE_COLOR",
}

export interface QueueJob {
  id: string;
  type: JobType;
  data: any;
  createdAt: Date;
}

@Injectable()
export class LocalQueueService {
  private readonly logger = new Logger(LocalQueueService.name);
  private queue: QueueJob[] = [];
  private jobIdCounter = 0;

  //Add job
  enqueue(type: JobType, data: any): QueueJob {
    const job: QueueJob = {
      id: `job-${++this.jobIdCounter}`,
      type,
      data,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.logger.debug(`Job ${job.id} enqueued (type: ${type})`);

    return job;
  }

  //Get job
  dequeue(): QueueJob | undefined {
    const job = this.queue.shift();
    if (job) {
      this.logger.debug(`Job ${job.id} dequeued`);
    }
    return job;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  //For now, plain simple & predictable, but different if we were to do it with redis imo.
  async waitForProcessing(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1200));
  }
}
