import type { HandlerMethodDecorator } from '@aws-lambda-powertools/commons/types';
import type { Context, Handler } from 'aws-lambda';
import type { ZodSchema } from 'zod';
import { parse } from './parser.js';
import type { Envelope, ParserOptions } from './types/index.js';
import type { ParserOutput } from './types/parser.js';

/**
 * A decorator to parse your event.
 *
 * @example
 * ```typescript
 * import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
 * import type { Context } from 'aws-lambda';
 * import { z } from 'zod';
 * import { parser } from '@aws-lambda-powertools/parser';
 * import { SqsEnvelope } from '@aws-lambda-powertools/parser/envelopes';
 *
 * const OrderSchema = z.object({
 *   orderId: z.string(),
 *   description: z.string(),
 * });
 * type Order = z.infer<typeof OrderSchema>;
 *
 * class Lambda implements LambdaInterface {
 *   ⁣@parser({ envelope: SqsEnvelope, schema: OrderSchema })
 *   public async handler(event: Order, _context: Context): Promise<unknown> {
 *   // The SQS event is parsed and the payload is extracted and parsed
 *   const res = processOrder(event);
 *   return res;
 *   }
 * }
 * ```
 *
 * In case you want to parse the event and handle the error, you can use the safeParse option.
 * The safeParse option will return an object with the parsed event and an error object if the parsing fails.
 *
 * @example
 * ```typescript
 * import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
 * import type { SqSEvent, ParsedResult } from '@aws-lambda-powertools/parser/types;
 * import type { Context } from 'aws-lambda';
 * import { z } from 'zod';
 * import { parser } from '@aws-lambda-powertools/parser';
 * import { SqsEnvelope } from '@aws-lambda-powertools/parser/envelopes';
 *
 *
 * const OrderSchema = z.object({
 *   orderId: z.string(),
 *   description: z.string(),
 * }
 * type Order = z.infer<typeof OrderSchema>;
 *
 * class Lambda implements LambdaInterface {
 *   ⁣@parser({ envelope: SqsEnvelope, schema: OrderSchema,  safeParse: true })
 *   public async handler(event: ParsedResult<Order>, _context: Context): Promise<unknown> {
 *     if (event.success) {
 *      // event.data is the parsed event object of type Order
 *     } else {
 *      // event.error is the error object, you can inspect and recover
 *      // event.originalEvent is the original event that failed to parse
 *     }
 *   }
 * }
 * ```
 *
 * @param options.schema - The schema to use to parse the event
 * @param options.envelope - The envelope to use to parse the event, can be undefined
 * @param options.safeParse - Whether to use Zod's `safeParse` or not, if `true` it will return a `ParsedResult` with the original event when parsing fails
 */
export const parser = <
  TSchema extends ZodSchema,
  TEnvelope extends Envelope = undefined,
  TSafeParse extends boolean = false,
>(
  options: ParserOptions<TSchema, TEnvelope, TSafeParse>
): HandlerMethodDecorator => {
  return (_target, _propertyKey, descriptor) => {
    // biome-ignore lint/style/noNonNullAssertion: The descriptor.value is the method this decorator decorates, it cannot be undefined.
    const original = descriptor.value!;

    const { schema, envelope, safeParse } = options;

    descriptor.value = async function (
      this: Handler,
      event: ParserOutput<TSchema, TEnvelope, TSafeParse>,
      context: Context,
      callback
    ) {
      const parsedEvent = parse(event, envelope, schema, safeParse);

      return original.call(this, parsedEvent, context, callback);
    };

    return descriptor;
  };
};
