<?php
/**
 * Public footer.
 *
 * @package Meridian
 */

defined( 'ABSPATH' ) || exit;

$doc = \Meridian\Render\PageRenderer::current_document();
$show_footer = ! $doc || ! empty( $doc['settings']['showFooter'] );
if ( $show_footer ) {
	$f        = \Meridian\Navigation\Menus::footer();
	$identity = \Meridian\Navigation\Menus::identity();
	$name     = $identity['siteName'] ?: get_bloginfo( 'name' );
	$chrome = \Meridian\Render\Preview::is_preview() ? ' data-krg-chrome="footer"' : '';
	?>
	</div><!-- .m-page -->
	<footer class="m-site-footer"<?php echo $chrome; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<div class="m-container m-footer-grid">
			<div>
				<?php
				if ( ! empty( $f['logoId'] ) ) {
					echo wp_get_attachment_image( (int) $f['logoId'], 'medium', false, [ 'alt' => esc_attr( $name ) ] );
				} else {
					echo '<strong class="m-logo-text">' . esc_html( $name ) . '</strong>';
				}
				?>
				<p><?php echo esc_html( $f['text'] ?? '' ); ?></p>
				<?php if ( ! empty( $f['social'] ) ) : ?>
					<ul class="m-social">
						<?php foreach ( $f['social'] as $s ) : ?>
							<li><a href="<?php echo esc_url( $s['url'] ?? '#' ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $s['label'] ?? '' ); ?></a></li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</div>
			<nav aria-label="<?php esc_attr_e( 'Footer', 'meridian' ); ?>">
				<?php echo \Meridian\Navigation\Menus::render( $f['menuSlug'] ?? 'footer' ); // phpcs:ignore ?>
			</nav>
			<?php if ( ! empty( $f['extraTitle'] ) || ! empty( $f['extraText'] ) ) : ?>
				<div>
					<?php if ( ! empty( $f['extraTitle'] ) ) : ?>
						<strong><?php echo esc_html( $f['extraTitle'] ); ?></strong>
					<?php endif; ?>
					<p><?php echo esc_html( $f['extraText'] ?? '' ); ?></p>
				</div>
			<?php endif; ?>
			<?php if ( ! empty( $f['showSearch'] ) ) : ?>
				<div><?php get_search_form(); ?></div>
			<?php endif; ?>
		</div>
		<div class="m-container m-copyright"><?php echo esc_html( $f['copyright'] ?? '' ); ?></div>
	</footer>
	<?php
} else {
	echo '</div>';
}
wp_footer();
?>
</body>
</html>
