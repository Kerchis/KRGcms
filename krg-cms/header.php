<?php
/**
 * Public header.
 *
 * @package Meridian
 */

defined( 'ABSPATH' ) || exit;

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'krg-root' ); ?>>
<?php wp_body_open(); ?>
<a class="m-skip" href="#contenido"><?php esc_html_e( 'Saltar al contenido', 'meridian' ); ?></a>
<?php
$doc = \Meridian\Render\PageRenderer::current_document();
$show_header = ! $doc || ! empty( $doc['settings']['showHeader'] );
if ( $show_header ) {
	$h        = \Meridian\Navigation\Menus::header();
	$identity = \Meridian\Navigation\Menus::identity();
	$sticky   = ! empty( $h['sticky'] ) ? ' is-sticky' : '';
	$trans    = ! empty( $h['transparent'] ) ? ' is-transparent' : '';
	$align    = ( ( $h['align'] ?? 'left' ) === 'center' ) ? ' is-center' : '';
	$logo_id  = (int) ( $h['logoId'] ?: $identity['logoId'] );
	$logo_m   = (int) ( $h['logoMobile'] ?: $logo_id );
	$width    = absint( $h['logoWidth'] ?? 140 );
	$name     = $identity['siteName'] ?: get_bloginfo( 'name' );
	$chrome = \Meridian\Render\Preview::is_preview() ? ' data-krg-chrome="header"' : '';
	?>
	<header class="m-site-header<?php echo esc_attr( $sticky . $trans . $align ); ?>"<?php echo $chrome; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<div class="m-container m-header-inner">
			<a class="m-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<?php
				if ( $logo_id ) {
					echo '<span class="m-logo-desktop">';
					echo wp_get_attachment_image( $logo_id, 'full', false, [ 'style' => 'width:' . $width . 'px;height:auto', 'alt' => esc_attr( $name ) ] );
					echo '</span>';
					echo '<span class="m-logo-mobile">';
					echo wp_get_attachment_image( $logo_m, 'full', false, [ 'style' => 'width:' . min( $width, 120 ) . 'px;height:auto', 'alt' => esc_attr( $name ) ] );
					echo '</span>';
				} else {
					echo '<span class="m-logo-text">' . esc_html( $name ) . '</span>';
				}
				?>
			</a>
			<button class="m-nav-toggle" type="button" aria-expanded="false" aria-controls="m-nav"><?php esc_html_e( 'Menú', 'meridian' ); ?></button>
			<nav id="m-nav" class="m-header-nav" aria-label="<?php esc_attr_e( 'Principal', 'meridian' ); ?>">
				<?php echo \Meridian\Navigation\Menus::render( $h['menuSlug'] ?? 'header' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</nav>
			<?php if ( ! empty( $h['ctaText'] ) ) : ?>
				<a class="m-btn m-btn-primary m-header-cta" href="<?php echo esc_url( $h['ctaUrl'] ?: '#' ); ?>"><?php echo esc_html( $h['ctaText'] ); ?></a>
			<?php endif; ?>
		</div>
	</header>
	<?php
}
?>
<div id="contenido" class="m-page">
