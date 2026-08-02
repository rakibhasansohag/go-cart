'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	CheckCircle2,
	Eye,
	Mail,
	RotateCcw,
	Save,
	Search,
	Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { queryKeys } from '@/lib/query-keys';
import {
	getEmailTemplates,
	previewEmailTemplate,
	publishEmailTemplate,
	resetEmailTemplate,
	saveEmailTemplateDraft,
	sendTestEmailTemplate,
	type EmailTemplateInput,
} from '@/queries/email-templates';

const JoditEditor = dynamic(() => import('jodit-react'), {
	ssr: false,
	loading: () => (
		<div className='h-[320px] animate-pulse rounded-lg border bg-muted/30' />
	),
});

type Templates = Awaited<ReturnType<typeof getEmailTemplates>>;

function formFromTemplate(template: Templates[number]): EmailTemplateInput {
	return { templateKey: template.templateKey, ...template.draft };
}

export default function EmailTemplateManager({
	initialTemplates,
}: {
	initialTemplates: Templates;
}) {
	const queryClient = useQueryClient();
	const { resolvedTheme } = useTheme();
	const [search, setSearch] = useState('');
	const [selectedKey, setSelectedKey] = useState(
		initialTemplates[0]?.templateKey ?? '',
	);
	const [form, setForm] = useState<EmailTemplateInput | null>(
		initialTemplates[0] ? formFromTemplate(initialTemplates[0]) : null,
	);
	const [previewHtml, setPreviewHtml] = useState('');
	const [previewSubject, setPreviewSubject] = useState('');
	const [testRecipient, setTestRecipient] = useState('');

	const { data: templates = initialTemplates } = useQuery({
		queryKey: queryKeys.dashboard.emailTemplates(),
		queryFn: getEmailTemplates,
		initialData: initialTemplates,
		staleTime: 5 * 60 * 1000,
	});
	const selected = templates.find(
		(template) => template.templateKey === selectedKey,
	);

	useEffect(() => {
		if (!selected) return;
		setForm(formFromTemplate(selected));
		setPreviewHtml('');
		setPreviewSubject('');
	}, [selected]);

	const filteredTemplates = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return templates;
		return templates.filter((template) =>
			[template.name, template.category, template.templateKey]
				.join(' ')
				.toLowerCase()
				.includes(query),
		);
	}, [search, templates]);

	const editorConfig = useMemo(
		() => ({
			theme: resolvedTheme === 'dark' ? 'dark' : 'default',
			height: 320,
			showPlaceholder: false,
			askBeforePasteHTML: false,
			askBeforePasteFromWord: false,
			defaultActionOnPaste: 'insert_clear_html' as const,
			buttons: [
				'bold',
				'italic',
				'underline',
				'ul',
				'ol',
				'blockquote',
				'link',
				'undo',
				'redo',
			],
		}),
		[resolvedTheme],
	);

	const refreshTemplates = async () => {
		await queryClient.invalidateQueries({
			queryKey: queryKeys.dashboard.emailTemplates(),
		});
	};

	const saveMutation = useMutation({
		mutationFn: saveEmailTemplateDraft,
		onSuccess: async () => {
			toast.success('Draft saved. Published email remains unchanged.');
			await refreshTemplates();
		},
		onError: (error) => toast.error(error.message),
	});
	const previewMutation = useMutation({
		mutationFn: previewEmailTemplate,
		onSuccess: (preview) => {
			setPreviewHtml(preview.html);
			setPreviewSubject(preview.subject);
		},
		onError: (error) => toast.error(error.message),
	});
	const publishMutation = useMutation({
		mutationFn: async (input: EmailTemplateInput) => {
			await saveEmailTemplateDraft(input);
			return publishEmailTemplate(input.templateKey);
		},
		onSuccess: async (result) => {
			toast.success(`Template version ${result.version} published.`);
			await refreshTemplates();
		},
		onError: (error) => toast.error(error.message),
	});
	const resetMutation = useMutation({
		mutationFn: resetEmailTemplate,
		onSuccess: async () => {
			toast.success('Custom template removed. Default restored.');
			await refreshTemplates();
		},
		onError: (error) => toast.error(error.message),
	});
	const testMutation = useMutation({
		mutationFn: sendTestEmailTemplate,
		onSuccess: (result) =>
			toast.success(`Test email sent to ${result.recipientEmail}.`),
		onError: (error) => toast.error(error.message),
	});

	if (!selected || !form) {
		return (
			<div className='rounded-xl border border-dashed p-10 text-center text-muted-foreground'>
				No email templates are registered.
			</div>
		);
	}

	const busy =
		saveMutation.isPending ||
		publishMutation.isPending ||
		resetMutation.isPending ||
		testMutation.isPending;

	return (
		<div className='grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
			<aside aria-label='Email template list' className='space-y-3'>
				<div className='relative'>
					<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder='Search templates...'
						aria-label='Search email templates'
						className='pl-9'
					/>
				</div>
				<nav aria-label='Choose an email template' className='space-y-2'>
					{filteredTemplates.map((template) => (
						<button
							type='button'
							key={template.templateKey}
							onClick={() => setSelectedKey(template.templateKey)}
							aria-current={selectedKey === template.templateKey ? 'page' : undefined}
							className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
								selectedKey === template.templateKey
									? 'border-primary bg-primary/5'
									: 'border-border bg-card hover:bg-muted/60'
							}`}
						>
							<span className='flex items-start justify-between gap-3'>
								<span>
									<span className='block font-semibold'>{template.name}</span>
									<span className='mt-1 block text-xs text-muted-foreground'>
										{template.category}
									</span>
								</span>
								<Badge variant={template.hasPublishedOverride ? 'default' : 'secondary'}>
									{template.hasPublishedOverride
										? `Custom v${template.publishedVersion}`
										: 'Default'}
								</Badge>
							</span>
						</button>
					))}
				</nav>
			</aside>

			<section aria-labelledby='template-editor-heading' className='min-w-0 space-y-5'>
				<Card>
					<CardHeader className='border-b'>
						<div className='flex flex-wrap items-start justify-between gap-4'>
							<div>
								<CardTitle id='template-editor-heading'>{selected.name}</CardTitle>
								<p className='mt-1 max-w-3xl text-sm text-muted-foreground'>
									{selected.description}
								</p>
							</div>
							<div className='flex items-center gap-2'>
								<Label htmlFor='template-enabled'>Custom template enabled</Label>
								<Switch
									id='template-enabled'
									checked={form.enabled}
									onCheckedChange={(enabled) => setForm({ ...form, enabled })}
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent className='space-y-5 pt-6'>
						<div className='grid gap-4 lg:grid-cols-2'>
							<div className='space-y-2'>
								<Label htmlFor='email-subject'>Subject</Label>
								<Input
									id='email-subject'
									value={form.subject}
									onChange={(event) => setForm({ ...form, subject: event.target.value })}
									maxLength={200}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='email-preheader'>Preheader</Label>
								<Input
									id='email-preheader'
									value={form.preheader}
									onChange={(event) => setForm({ ...form, preheader: event.target.value })}
									maxLength={300}
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<Label>Email body</Label>
							<p className='text-xs text-muted-foreground'>
								Scripts, images, unsafe URLs, inline styles, and unsupported HTML are removed on the server.
							</p>
							<JoditEditor
								value={form.bodyHtml}
								config={editorConfig}
								onBlur={(bodyHtml) => setForm({ ...form, bodyHtml })}
							/>
						</div>
						<div className='grid gap-4 lg:grid-cols-2'>
							<div className='space-y-2'>
								<Label htmlFor='cta-label'>CTA label</Label>
								<Input
									id='cta-label'
									value={form.ctaLabel}
									onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
									maxLength={60}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='test-recipient'>Test recipient</Label>
								<Input
									id='test-recipient'
									type='email'
									value={testRecipient}
									onChange={(event) => setTestRecipient(event.target.value)}
									placeholder='Defaults to your admin email'
								/>
							</div>
						</div>

						<div className='rounded-lg border bg-muted/30 p-3'>
							<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Allowed variables</p>
							<div className='mt-2 flex flex-wrap gap-2'>
								{selected.allowedVariables.map((variable) => (
									<button
										type='button'
										key={variable}
										onClick={() => navigator.clipboard.writeText(`{{${variable}}}`)}
										className='cursor-pointer rounded-md border bg-background px-2 py-1 font-mono text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
										title={`Copy {{${variable}}}`}
									>
										{`{{${variable}}}`}
									</button>
								))}
							</div>
						</div>

						<div className='flex flex-wrap gap-2 border-t pt-5'>
							<Button disabled={busy} onClick={() => saveMutation.mutate(form)}>
								<Save /> Save draft
							</Button>
							<Button variant='outline' disabled={previewMutation.isPending} onClick={() => previewMutation.mutate(form)}>
								<Eye /> Preview
							</Button>
							<Button variant='outline' disabled={busy} onClick={() => testMutation.mutate({ template: form, recipientEmail: testRecipient || undefined })}>
								<Send /> Send test
							</Button>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant='secondary' disabled={busy}>
										<CheckCircle2 /> Publish
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Publish this email template?</AlertDialogTitle>
										<AlertDialogDescription>
											Future matching emails will use this custom version. Existing queued jobs will resolve it when sent.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction onClick={() => publishMutation.mutate(form)}>Publish</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant='ghost' disabled={!selected.hasDraftOverride || busy}>
										<RotateCcw /> Restore default
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Restore the code-owned default?</AlertDialogTitle>
										<AlertDialogDescription>
											This removes the custom draft and published override. New emails immediately use GoCart&apos;s default template.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Keep custom template</AlertDialogCancel>
										<AlertDialogAction onClick={() => resetMutation.mutate(selected.templateKey)}>Restore default</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-lg'><Mail /> Preview</CardTitle>
						{previewSubject && <p className='text-sm text-muted-foreground'>Subject: {previewSubject}</p>}
					</CardHeader>
					<CardContent>
						{previewHtml ? (
							<Tabs defaultValue='desktop'>
								<TabsList aria-label='Preview size'>
									<TabsTrigger value='desktop'>Desktop</TabsTrigger>
									<TabsTrigger value='mobile'>Mobile</TabsTrigger>
								</TabsList>
								<TabsContent value='desktop'>
									<iframe title='Desktop email preview' sandbox='' srcDoc={previewHtml} className='h-[680px] w-full rounded-lg border bg-white' />
								</TabsContent>
								<TabsContent value='mobile'>
									<div className='mx-auto max-w-[390px]'><iframe title='Mobile email preview' sandbox='' srcDoc={previewHtml} className='h-[680px] w-full rounded-lg border bg-white' /></div>
								</TabsContent>
							</Tabs>
						) : (
							<div className='flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground'>
								<Eye className='mb-3 size-8' />
								<p>Choose Preview to compile the current draft with safe demo data.</p>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
