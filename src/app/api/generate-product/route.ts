/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { description, categoryName, subCategoryName } = body;

		// Validate input
		if (!description) {
			return NextResponse.json(
				{ error: 'Product description is required' },
				{ status: 400 },
			);
		}

		if (!categoryName || !subCategoryName) {
			return NextResponse.json(
				{ error: 'Category and sub-category are required' },
				{ status: 400 },
			);
		}

		// Initialize Gemini model (correct model name)
		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

		// Create detailed prompt
		const prompt = `
You are an expert e-commerce product content creator. Generate COMPLETE product details based on this information:

**Product Description:**
"${description}"

**Category:** ${categoryName}
**Sub-Category:** ${subCategoryName}

**Generate a JSON object with ALL fields (MUST be valid JSON, no markdown, no code blocks):**

{
  "name": "Creative, compelling product name (5-10 words, SEO-friendly)",
  "description": "<h4><strong>Engaging headline</strong></h4><p>Rich HTML description with 3-4 paragraphs. Use <p>, <ul>, <li>, <strong> tags. Make it professional and detailed. Include benefits, features, and emotional appeal.</p><ul><li><strong>Feature 1</strong>: Description</li><li><strong>Feature 2</strong>: Description</li></ul>",
  "variantName": "Main variant name (e.g., 'Classic Blue', 'Standard Edition', 'Premium Version')",
  "variantDescription": "<p>Detailed HTML description specific to this variant (2-3 paragraphs). Explain what makes THIS variant unique.</p>",
  "brand": "Creative, memorable brand name that fits the product style",
  "sku": "Unique SKU code (format: ABC-XXX-YYY-123)",
  "weight": 0.5,
  "colors": [
    { "color": "#1E40AF" },
    { "color": "#DC2626" },
    { "color": "#059669" }
  ],
  "sizes": [
    {
      "size": "Small",
      "quantity": 150,
      "price": 24.99,
      "discount": 0
    },
    {
      "size": "Medium",
      "quantity": 200,
      "price": 29.99,
      "discount": 5
    },
    {
      "size": "Large",
      "quantity": 100,
      "price": 34.99,
      "discount": 10
    }
  ],
  "product_specs": [
    { "name": "Material", "value": "Specific material details" },
    { "name": "Dimensions", "value": "Exact measurements" },
    { "name": "Weight", "value": "Weight with unit" },
    { "name": "Care Instructions", "value": "How to maintain" },
    { "name": "Origin", "value": "Where it's made" },
    { "name": "Warranty", "value": "Warranty information" }
  ],
  "variant_specs": [
    { "name": "Color", "value": "Detailed color description" },
    { "name": "Finish", "value": "Surface finish type" },
    { "name": "Style", "value": "Design style" }
  ],
  "keywords": [
    "keyword1",
    "keyword2",
    "keyword3",
    "keyword4",
    "keyword5",
    "keyword6",
    "keyword7",
    "keyword8"
  ],
  "questions": [
    {
      "question": "Q: What makes this product unique?",
      "answer": "A: Detailed answer explaining unique selling points (2-3 sentences)"
    },
    {
      "question": "Q: How should I care for this product?",
      "answer": "A: Clear maintenance instructions"
    },
    {
      "question": "Q: What is the return policy?",
      "answer": "A: Standard return policy explanation"
    },
    {
      "question": "Q: Is this suitable for [common use case]?",
      "answer": "A: Specific answer about use cases"
    }
  ]
}

**CRITICAL Instructions:**
1. Analyze the product description carefully based on the ${categoryName} > ${subCategoryName} context
2. Generate 4-8 relevant colors with hex codes that match the product aesthetic
3. Create 1-4 size options (use "Standard" if size doesn't apply)
4. Generate 5-10 SEO-optimized keywords
5. Create 3-5 realistic Q&A pairs
6. Make descriptions rich, engaging, and HTML-formatted
7. Ensure SKU is unique and professional
8. Product specs should have 4-8 items
9. Variant specs should have 2-4 items
10. Prices should be realistic for the product type
11. Return ONLY valid JSON, no markdown, no code blocks, no backticks

Generate NOW:`;

		// Generate content
		const result = await model.generateContent(prompt);
		const response = await result.response;
		let text = response.text();

		// Aggressive cleaning of markdown
		text = text
			.replace(/```json\n?/g, '')
			.replace(/```\n?/g, '')
			.replace(/^```/g, '')
			.replace(/```$/g, '')
			.trim();

		// Parse JSON
		let productData;
		try {
			productData = JSON.parse(text);
		} catch (parseError) {
			console.error('JSON Parse Error:', parseError);
			console.error('Raw text:', text);
			throw new Error('Failed to parse AI response as JSON');
		}

		// Return generated data
		return NextResponse.json({
			success: true,
			data: productData,
		});
	} catch (error: any) {
		console.error('Error generating product:', error);
		return NextResponse.json(
			{
				error: 'Failed to generate product details',
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
